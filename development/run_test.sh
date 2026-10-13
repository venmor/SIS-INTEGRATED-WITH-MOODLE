#!/bin/bash
cd /home/hangoma/SIS-INTEGRATED-WITH-MOODLE/development
pkill -f "next dev" 2>/dev/null
pkill -f "node apps/api/dist/main.js" 2>/dev/null
sleep 2
npx playwright test tests/browser/test-demo.spec.ts --reporter=line 2>&1