#!/bin/bash

SERVER="31.128.39.74"
USERNAME="root"
LOCAL_DIR="$HOME/Document/stavka-analiz/dist"
REMOTE_DIR="/root/analizer"
ARCHIVE_PATH="$HOME/Document/stavka-analiz/dist.tar.gz"

echo "📦 Creating archive excluding node_modules..."

# Arxiv yaratish (node_modules va boshqa keraksiz fayllarsiz)
tar --exclude=".idea" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="init.bat" \
    --exclude="dist" \
    -czvf "$ARCHIVE_PATH" -C "$(dirname "$LOCAL_DIR")" .

echo "🚀 Starting SCP upload..."

# Faylni serverga yuborish
scp "$ARCHIVE_PATH" "$USERNAME@$SERVER:$REMOTE_DIR"

echo "📁 Files uploaded. Extracting on server and starting project..."

# SSH orqali serverda buyruqlar ketma-ketligi
ssh "$USERNAME@$SERVER" << EOF
cd "$REMOTE_DIR"
tar -xzvf dist.tar.gz
npm install
tsc
rm dist.tar.gz
cp .env dist/.env
pm2 stop index || true
pm2 start /root/analizer/dist/index.js --env production
EOF

echo "✅ Project started on server."
