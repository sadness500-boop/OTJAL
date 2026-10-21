#!/usr/bin/env python3
"""OTJAL 웹 버전(PWA) 빌드 — web/index.html → docs/  (GitHub Pages용)
Designed & Developed by Rat Rae Choi"""
import os, re, shutil, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=open(os.path.join(ROOT,'web/index.html'),encoding='utf-8').read()
ver=re.search(r'APP_VERSION = "([\d.]+)"',src).group(1)
LIBS=[("https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js","lib/three.min.js"),
      ("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js","lib/OrbitControls.js"),
      ("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js","lib/RoomEnvironment.js"),
      ("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js","lib/qrcode.js")]
for a,b in LIBS:
    assert a in src, a; src=src.replace(a,b)
D=os.path.join(ROOT,'docs'); os.makedirs(os.path.join(D,'lib'),exist_ok=True)
for f in os.listdir(os.path.join(ROOT,'android/libs')):
    if f.endswith('.js'): shutil.copy(os.path.join(ROOT,'android/libs',f),os.path.join(D,'lib',f))
from PIL import Image
ic=Image.open(os.path.join(ROOT,'web/icon-512.png'))
for s in (192,512): ic.resize((s,s),Image.LANCZOS).save(os.path.join(D,f'icon-{s}.png'))
ic.resize((180,180),Image.LANCZOS).save(os.path.join(D,'apple-touch-icon.png'))
head=f'''<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="OTJAL — 내 체형과 닮은 실사 모델에 입혀 보고, 24개 쇼핑몰에서 나에게 맞는 옷만 골라주는 AI 퍼스널 스타일리스트">
<meta name="theme-color" content="#FFFFFF">
<meta property="og:title" content="OTJAL"><meta property="og:description" content="나에게 잘 맞는 옷, OTJAL이 찾아준다."><meta property="og:image" content="icon-512.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="OTJAL">
<style>html,body{{margin:0}}body{{font-size:14px}}img{{max-width:100%}}[hidden]{{display:none!important}}:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}</style>
</head><body>
'''
open(os.path.join(D,'index.html'),'w',encoding='utf-8').write(head+src+'\n</body></html>\n')
json.dump({"name":"OTJAL","short_name":"OTJAL","description":"AI 퍼스널 스타일리스트 — 실사 모델 피팅·맞춤 추천·24개 쇼핑몰 연결",
  "lang":"ko","start_url":"./","scope":"./","display":"standalone","background_color":"#FFFFFF","theme_color":"#FFFFFF",
  "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png","purpose":"any maskable"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]},
  open(os.path.join(D,'manifest.webmanifest'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
open(os.path.join(D,'sw.js'),'w').write(f'''// OTJAL service worker v{ver} — Rat Rae Choi
const C="otjal-v{ver}", PRE=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","lib/three.min.js","lib/OrbitControls.js","lib/RoomEnvironment.js","lib/qrcode.js"];
self.addEventListener("install",e=>{{ e.waitUntil(caches.open(C).then(c=>c.addAll(PRE)).then(()=>self.skipWaiting())); }});
self.addEventListener("activate",e=>{{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); }});
self.addEventListener("fetch",e=>{{ const u=new URL(e.request.url); if (e.request.method!=="GET") return;
  if (u.origin===location.origin) e.respondWith(caches.match(e.request,{{ignoreSearch:true}}).then(r=>r||fetch(e.request).then(res=>{{ const cp=res.clone(); caches.open(C).then(c=>c.put(e.request,cp)); return res; }})));
  else if (/fonts\\.(googleapis|gstatic)\\.com/.test(u.host)) e.respondWith(caches.open(C).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(res=>{{ c.put(e.request,res.clone()); return res; }}))));
}});
''')
open(os.path.join(D,'.nojekyll'),'w').write('')
print('docs/ built', ver)
