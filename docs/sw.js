// OTJAL service worker v0.5.3 — Rat Rae Choi
const C="otjal-v0.5.3", PRE=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","lib/three.min.js","lib/OrbitControls.js","lib/RoomEnvironment.js","lib/qrcode.js"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(C).then(c=>c.addAll(PRE)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{ const u=new URL(e.request.url); if (e.request.method!=="GET") return;
  if (u.origin===location.origin) e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{ const cp=res.clone(); caches.open(C).then(c=>c.put(e.request,cp)); return res; })));
  else if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) e.respondWith(caches.open(C).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(res=>{ c.put(e.request,res.clone()); return res; }))));
});
