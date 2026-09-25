#!/bin/sh
# Install / refresh TermHive Cloud host files. Idempotent; run as root from
# /opt/termhive-v2 after `npm ci && npm run build`. Does not (re)start
# services — see docs/CLOUD_BRIEF.md §6 for the order.
set -eu
cd "$(dirname "$0")/.."

install -d -m 0700 -o root -g root /etc/termhive /etc/termhive/ws /var/lib/termhive-cloud
chmod 0700 /root

if [ ! -e /etc/termhive/cloud.env ]; then
  install -m 0600 -o root -g root deploy/cloud.env.example /etc/termhive/cloud.env
fi
chmod 0600 /etc/termhive/cloud.env

install -m 0644 deploy/systemd/termhive-cloud.service /etc/systemd/system/termhive-cloud.service
install -m 0644 'deploy/systemd/termhive-ws@.service' '/etc/systemd/system/termhive-ws@.service'
install -d -m 0755 /etc/systemd/system/termhive2.service.d
install -m 0644 deploy/systemd/termhive2.service.d/cloud-ports.conf \
  /etc/systemd/system/termhive2.service.d/cloud-ports.conf
install -m 0755 deploy/bin/termhive-admin /usr/local/bin/termhive-admin

install -d -m 0755 /etc/nftables.d
install -m 0644 deploy/nftables/termhive.nft /etc/nftables.d/termhive.nft
if ! grep -q '^include "/etc/nftables.d/\*.nft"' /etc/nftables.conf; then
  printf '\ninclude "/etc/nftables.d/*.nft"\n' >> /etc/nftables.conf
fi
nft -c -f /etc/nftables.d/termhive.nft
nft -f /etc/nftables.d/termhive.nft
systemctl enable nftables.service >/dev/null

# The code is shared by every workspace user: root-owned, world-readable.
chown -R root:root /opt/termhive-v2
chmod -R go+rX,go-w /opt/termhive-v2

systemctl daemon-reload
echo "installed. next: systemctl restart termhive2 && systemctl enable --now termhive-cloud"
