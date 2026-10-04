#!/bin/sh
# Install / refresh Termates Cloud host files. Idempotent; run as root from
# /opt/termates after `npm ci && npm run build`. Does not (re)start
# services — see docs/CLOUD_BRIEF.md §6 for the order.
set -eu
cd "$(dirname "$0")/.."

install -d -m 0700 -o root -g root /etc/termates /etc/termates/ws /var/lib/termates-cloud
chmod 0700 /root

if [ ! -e /etc/termates/cloud.env ]; then
  install -m 0600 -o root -g root deploy/cloud.env.example /etc/termates/cloud.env
fi
chmod 0600 /etc/termates/cloud.env

install -m 0644 deploy/systemd/termates-cloud.service /etc/systemd/system/termates-cloud.service
install -m 0644 'deploy/systemd/termates-ws@.service' '/etc/systemd/system/termates-ws@.service'
install -m 0644 deploy/systemd/termates.service /etc/systemd/system/termates.service
install -d -m 0755 /etc/systemd/system/termates.service.d
install -m 0644 deploy/systemd/termates.service.d/cloud-ports.conf \
  deploy/systemd/termates.service.d/gemini.conf \
  /etc/systemd/system/termates.service.d/
install -m 0755 deploy/bin/termates-admin /usr/local/bin/termates-admin

install -d -m 0755 /etc/nftables.d
install -m 0644 deploy/nftables/termates.nft /etc/nftables.d/termates.nft
if ! grep -q '^include "/etc/nftables.d/\*.nft"' /etc/nftables.conf; then
  printf '\ninclude "/etc/nftables.d/*.nft"\n' >> /etc/nftables.conf
fi
nft -c -f /etc/nftables.d/termates.nft
nft -f /etc/nftables.d/termates.nft
systemctl enable nftables.service >/dev/null

# The code is shared by every workspace user: root-owned, world-readable.
chown -R root:root /opt/termates
chmod -R go+rX,go-w /opt/termates

systemctl daemon-reload
echo "installed. next: systemctl restart termates && systemctl enable --now termates-cloud"
