#!/bin/sh
# One-time rename of workspace Linux accounts th-<hex> → tm-<hex> on a Termates
# Cloud host. Run as root from /opt/termates once the tm- build is installed:
#
#   sh deploy/migrate-th-users-to-tm.sh
#
# Stops the control plane and the th- workspaces (their agents end), renames
# each account, group and home, rewrites the paths that mention the old home,
# updates the cloud DB, and starts again exactly what ran before. UIDs do not
# change, so file ownership and the nft rules' uids stay valid. Safe to re-run.
set -eu

DB=/var/lib/termates-cloud/cloud.db
ENV_DIR=/etc/termates/ws
LIMITS_DIR=/etc/termates-limits
UNITS=/etc/systemd/system

[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }

users=$(getent passwd | cut -d: -f1 | grep -E '^th-[0-9a-f]{8}$' || true)
[ -n "$users" ] || { echo "no th- accounts left"; exit 0; }

cloud_active=$(systemctl is-active termates-cloud.service || true)
enabled=""
active=""
for old in $users; do
  if [ -e "$UNITS/multi-user.target.wants/termates-ws@$old.service" ]; then enabled="$enabled $old"; fi
  if [ "$(systemctl is-active "termates-ws@$old.service" || true)" = active ]; then active="$active $old"; fi
done
echo "accounts:$(echo $users | sed 's/^/ /')"
echo "enabled:$enabled"
echo "running:$active"

systemctl stop termates-cloud.service
for old in $users; do
  systemctl stop "termates-ws@$old.service" 2>/dev/null || true
  systemctl disable "termates-ws@$old.service" 2>/dev/null || true
done

for old in $users; do
  new="tm-${old#th-}"
  # Anything still running as the account (stray agent children) blocks usermod.
  pkill -KILL -u "$old" 2>/dev/null || true
  usermod -l "$new" "$old"
  groupmod -n "$new" "$old" 2>/dev/null || true
  usermod -d "/home/$new" -m "$new"
  echo "renamed $old -> $new"

  if [ -f "$ENV_DIR/$old.env" ]; then
    sed -e "s#/home/$old#/home/$new#g" -e "s#\b$old\b#$new#g" "$ENV_DIR/$old.env" > "$ENV_DIR/$new.env"
    chmod 0600 "$ENV_DIR/$new.env"
    rm "$ENV_DIR/$old.env"
  fi
  if [ -f "$LIMITS_DIR/$old.json" ]; then mv "$LIMITS_DIR/$old.json" "$LIMITS_DIR/$new.json"; fi

  home="/home/$new"
  for f in "$home/.claude.json" "$home/.codex/config.toml" "$home/.gemini/settings.json"; do
    if [ -f "$f" ]; then sed -i "s#/home/$old#/home/$new#g" "$f"; fi
  done
  if [ -d "$home/.termates" ]; then
    grep -rlZ "/home/$old" "$home/.termates" 2>/dev/null | xargs -0 -r sed -i "s#/home/$old#/home/$new#g"
  fi
  # Claude keys its per-project session history by the cwd path.
  if [ -d "$home/.claude/projects" ]; then
    for dir in "$home"/.claude/projects/-home-"$old"*; do
      [ -d "$dir" ] || continue
      base=$(basename "$dir")
      mv "$dir" "$home/.claude/projects/-home-$new${base#-home-$old}"
    done
  fi
done

node --disable-warning=ExperimentalWarning -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('$DB');
const r = db.prepare(\"UPDATE workspaces SET unix_user = 'tm-' || substr(unix_user, 4) WHERE unix_user LIKE 'th-%'\").run();
console.log('db rows updated:', r.changes);
"

for old in $enabled; do systemctl enable "termates-ws@tm-${old#th-}.service"; done
for old in $active; do systemctl start "termates-ws@tm-${old#th-}.service"; done
if [ "$cloud_active" = active ]; then systemctl start termates-cloud.service; fi
termates-admin sync-firewall

echo "done. check: termates-admin users"
