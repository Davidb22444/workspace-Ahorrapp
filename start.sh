#!/bin/bash
cd /home/z/my-project

# Start Next.js on 3456
npx next dev -p 3456 -H 0.0.0.0 2>&1 | tee dev.log &
NEXT_PID=$!

# Wait for Next.js to be ready
for i in $(seq 1 30); do
  sleep 1
  if curl -s --max-time 1 http://127.0.0.1:3456/ > /dev/null 2>&1; then
    break
  fi
done

# Start TCP proxy 3000 -> 3456
node -e "
const net = require('net');
const server = net.createServer((client) => {
  const proxy = net.connect(3456, '127.0.0.1', () => {
    client.pipe(proxy);
    proxy.pipe(client);
  });
  proxy.on('error', () => client.destroy());
  client.on('error', () => proxy.destroy());
});
server.listen(3000, '0.0.0.0', () => {});
" &

# Wait for both
wait $NEXT_PID
