const CACHE = "xiaoliuren-v3";
const ASSETS = ["./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", event => event.respondWith(
  caches.match(event.request).then(r => r || fetch(event.request))
));
