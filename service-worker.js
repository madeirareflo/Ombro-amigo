const CACHE='ombro-amigo-v16';
const CACHE_PREFIX='ombro-amigo-';
const ASSETS=['./','./index.html','./styles.css','./manifest.webmanifest','./icon.svg','./app/main.js','./app/clipboard.js','./app/summary-model.js','./conversation/engine.js','./conversation/policy.js','./storage/local-store.js','./storage/crypto.js','./storage/secure-store.js','./safety/policy.js'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

async function navigationResponse(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok){
      const cache=await caches.open(CACHE);
      await Promise.all([
        cache.put('./',response.clone()),
        cache.put('./index.html',response.clone())
      ]);
    }
    return response;
  }catch{
    return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
  }
}

async function assetResponse(request){
  const cached=await caches.match(request);
  if(cached) return cached;
  const response=await fetch(request);
  if(response.ok){
    const cache=await caches.open(CACHE);
    await cache.put(request,response.clone());
  }
  return response;
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  if(event.request.mode==='navigate'){
    event.respondWith(navigationResponse(event.request));
    return;
  }

  event.respondWith(assetResponse(event.request));
});
