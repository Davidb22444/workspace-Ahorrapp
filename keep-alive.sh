#!/bin/bash
# Keep-alive wrapper for Next.js server
cd /home/z/my-project
while true; do
  PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js 2>&1
  echo "Server exited, restarting in 1s..."
  sleep 1
done