#!/bin/bash
# ============================================================
# VPS Setup Script for LiveKit + Egress
# Run as root on Ubuntu 20.04+ or Debian 11+
# ============================================================

set -e

echo "==> Installing Docker..."
apt-get update -qq
apt-get install -y docker.io docker-compose curl

echo "==> Starting Docker..."
systemctl enable docker
systemctl start docker

echo "==> Creating recordings directory..."
mkdir -p /opt/kvant-video
cd /opt/kvant-video

echo ""
echo "==> Copy the following files to /opt/kvant-video/:"
echo "    docker-compose.yml"
echo "    config.yaml"
echo "    egress.yaml"
echo "    nginx.conf"
echo ""
echo "==> Then edit config.yaml and egress.yaml:"
echo "    Replace LIVEKIT_HOST in Replit secrets with http://YOUR_VPS_IP:7880"
echo "    Replace RECORDINGS_BASE_URL with http://YOUR_VPS_IP:8080/recordings"
echo ""
echo "==> Starting services..."
docker-compose up -d

echo ""
echo "==> Done! Services running:"
docker-compose ps

echo ""
echo "==> Open these ports on your VPS firewall:"
echo "    TCP: 7880, 7881, 8080"
echo "    UDP: 7882, 50000-60000"
