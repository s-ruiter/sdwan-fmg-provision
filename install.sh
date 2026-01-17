#!/bin/bash

# Check for sudo/root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run with sudo: sudo ./install-docker.sh"
  exit 1
fi

set -e

echo "--- Detected Ubuntu 22.04 (Jammy) ---"

# 1. Clean up the old (wrong) repository file if it exists
rm -f /etc/apt/sources.list.d/docker.list

# 2. Update and install prerequisites
apt-get update
apt-get install -y ca-certificates curl gnupg

# 3. Setup GPG Key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# 4. Add the UBUNTU Repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "--- Installation Successful! ---"
docker --version
docker compose version

# 6. Run provisioning tool
docker-compose up -d --build

echo "--- Installation Complete! ---"