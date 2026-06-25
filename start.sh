#!/bin/bash
cd /home/z/my-project
while true; do
  bun run dev 2>&1 | tee -a dev.log
  echo "[$(date)] Server died, restarting in 3s..." >> dev.log
  sleep 3
done