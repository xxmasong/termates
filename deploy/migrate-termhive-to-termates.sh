#!/bin/sh
# One-time cutover of a TermHive Cloud host to the Termates names. Run as root
# from the already-built checkout (still at /opt/termhive-v2):
#
#   sh deploy/migrate-termhive-to-termates.sh
#
# Stops every TermHive unit (running agents end), moves the repo, config, state
# and each workspace's ~/.termhive, installs the termates-* units, then starts
# again exactly the workspaces that were enabled / running before. Safe to
# re-run: every step skips what is already done.
set -eu

OLD_REPO=/opt/termhive-v2
NEW_REPO=/opt/termates
UNITS=/etc/systemd/system

[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }

move() { # move <from> <to>: only when the old path exists and the new one does not
  if [ -e "$1" ] && [ ! -e "$2" ]; then mv "$1" "$2"; echo "moved $1 -> $2"; fi
}

# ── 1. Remember which workspaces were enabled / running, then stop all ─────
enabled_ws=$(ls "$UNITS/multi-user.target.wants" 2>/dev/null |
  sed -n 's/^termhive-ws@\(.*\)\.service$/\1/p')
active_ws=$(systemctl list-units --plain --no-legend --state=active 'termhive-ws@*' |
  sed -n 's/^termhive-ws@\([^ ]*\)\.service.*/\1/p')
root_active=$(systemctl is-active termhive2.service || true)
echo "enabled workspaces: $enabled_ws"
echo "running workspaces: $active_ws"

systemctl stop termhive-cloud.service 2>/dev/null || true
for u in $enabled_ws $active_ws; do systemctl stop "termhive-ws@$u.service" 2>/dev/null || true; done
systemctl stop termhive2.service 2>/dev/null || true
for u in $enabled_ws; do systemctl disable "termhive-ws@$u.service" 2>/dev/null || true; done
systemctl disable termhive-cloud.service termhive2.service 2>/dev/null || true

# ── 2. Repo, config and state directories ─────────────────────────────────
move "$OLD_REPO" "$NEW_REPO"
# Old Codex configs and Claude project entries still point at the old path.
[ -e "$OLD_REPO" ] || ln -s "$NEW_REPO" "$OLD_REPO"

move /etc/termhive /etc/termates
move /etc/termhive-limits /etc/termates-limits
move /var/lib/termhive-cloud /var/lib/termates-cloud
move /etc/termhive2/gemini.env /etc/termates/gemini.env
rmdir /etc/termhive2 2>/dev/null || true

for f in /etc/termates/cloud.env /etc/termates/ws/*.env; do
  [ -f "$f" ] || continue
  sed -i -e 's/TERMHIVE_/TERMATES_/g' -e 's#/etc/termhive-limits#/etc/termates-limits#g' \
    -e 's/termhive-cloud/termates-cloud/g' -e 's/termhive-admin/termates-admin/g' \
    -e 's#/etc/termhive/#/etc/termates/#g' "$f"
done

# ── 3. Each workspace's data directory ────────────────────────────────────
for home in /root /home/th-*; do
  [ -d "$home" ] || continue
  move "$home/.termhive" "$home/.termates"
  for readme in "$home"/.termates/shared_content/*/README.md; do
    if [ -f "$readme" ]; then sed -i 's/Termhive/Termates/g' "$readme"; fi
  done
done

# ── 4. Old units, firewall table and admin CLI ────────────────────────────
rm -f "$UNITS/termhive-cloud.service" "$UNITS/termhive-ws@.service" "$UNITS/termhive2.service"
rm -rf "$UNITS/termhive2.service.d"
rm -f /usr/local/bin/termhive-admin /etc/nftables.d/termhive.nft
nft delete table inet termhive 2>/dev/null || true

# ── 5. Install the termates units and start what ran before ───────────────
sh "$NEW_REPO/deploy/install-cloud.sh"

systemctl enable termates.service
if [ "$root_active" = active ]; then systemctl start termates.service; fi
for u in $enabled_ws; do systemctl enable "termates-ws@$u.service"; done
for u in $active_ws; do systemctl start "termates-ws@$u.service"; done
systemctl enable --now termates-cloud.service
termates-admin sync-firewall

echo "done. check: systemctl status termates termates-cloud 'termates-ws@*'"
