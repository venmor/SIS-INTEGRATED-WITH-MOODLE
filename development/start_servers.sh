#!/bin/bash
pkill -f "next dev" 2>/dev/null
pkill -f "node apps/api/dist/main.js" 2>/dev/null
sleep 2
cd /home/hangoma/SIS-INTEGRATED-WITH-MOODLE/development
nohup node scripts/with-env.mjs node apps/api/dist/main.js > /tmp/api.log 2>&1 &
sleep 3
nohup node scripts/with-env.mjs npm run dev --workspace=web -- --port 3100 --webpack > /tmp/web.log 2>&1 &
sleep 10
echo "Servers started"