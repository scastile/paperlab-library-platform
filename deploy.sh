#!/bin/bash
# Deploy script — used by CI/CD and for easy local deploys
set -e

cd /opt/projects/paperlab-library-platform

echo "[$(date)] Pulling latest changes..."
git pull origin main

echo "[$(date)] Building containers..."
docker compose build

echo "[$(date)] Restarting services..."
docker compose up -d

echo "[$(date)] Deployment complete!"
docker compose ps
