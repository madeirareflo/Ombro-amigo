const CACHE='ombro-amigo-v14';
const ASSETS=['./','./index.html','./styles.css','./manifest.webmanifest','./icon.svg','./app/main.js','./app/clipboard.js','./app/summary-model.js','./conversation/engine.js','./conversation/policy.js','./storage/local-store.js','./storage/crypto.js','./storage/secure-store.js','./safety/policy.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})));});
