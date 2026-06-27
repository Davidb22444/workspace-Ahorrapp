const CACHE = 'ahorrapp-v1'
const STATIC = ['/', '/manifest.json', '/icons/icon-192.svg', '/icons/icon-512.svg', '/logo.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((all) => Promise.all(all.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
})

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then((r) => r || new Response('', { status: 504 })))
  )
})
