const CACHE = 'mortadelo-check-v5.9-core';
const CORE = ['./','./index.html','./app.css','./app.js','./manifest.webmanifest','./data/catalog.json','./data/catalog.js','./assets/icon-192.png','./assets/icon-512.png','./assets/avatar.png','./assets/export-images.js','./assets/mortadelo-check-logo.png','./assets/rata.png','./assets/ibanez-dibujando.png','./assets/icon-sound-header.png','./assets/icon-moviola-header.png','./assets/check-sound.mp3'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('mortadelo-check-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 const path=new URL(r.url).pathname;
 if(path.endsWith('/assets/BSO_1.mp3'))return;
 if(path.includes('/data/covers/')){
  e.respondWith(caches.match(r).then(x=>x||fetch(r).then(resp=>{if(resp.ok){const cp=resp.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return resp;})));return;
 }
 e.respondWith(caches.match(r).then(x=>x||fetch(r)));
});
