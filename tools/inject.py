# OTJAL — 3D 모듈·바디 데이터 주입 (Rat Rae Choi)
import re, base64, sys, os
R='/home/claude/otjal/'
html=open(R+'web/index.html',encoding='utf-8').read()
mod=open(R+'src/fig3d.js',encoding='utf-8').read().rstrip()+'\n'
s=html.find('/* ---------- 3D 실사 바디'); 
if s<0: s=html.find('const Fig3D = (() => {')
e=html.find('})();', html.find('return {ok, mountLive', s))+len('})();\n')
html=html[:s]+mod+html[e:]
def module(marker, endmark, path):
    global html
    s=html.find(marker); m=html.find(endmark, s)
    if s<0 or m<0: raise SystemExit('module marker missing: '+marker+' / '+endmark)
    e=html.find('})();', m)+len('})();\n')
    html=html[:s]+open(path,encoding='utf-8').read().rstrip()+'\n'+html[e:]
module('/* ---------- 실제 판매 상품 추천 엔진','\n  return {',R+'src/shop.js')
module('/* ---------- 패션 일러스트','\n  return {',R+'src/art.js')
def put(id_, typ, data):
    global html
    tag=f'<script id="{id_}" type="{typ}">'
    i=html.find(tag)
    block=tag+data+'</script>\n'
    if i>=0:
        j=html.find('</script>',i)+len('</script>\n'); html=html[:i]+block+html[j:]
    else:
        k=html.find('<script>\n'); html=html[:k]+block+html[k:]
put('otjal-body','application/octet-stream',base64.b64encode(open('/home/claude/mh/out/body.z','rb').read()).decode())
if os.path.exists('/home/claude/mh/out/skin.txt'): put('otjal-skin','text/plain',open('/home/claude/mh/out/skin.txt').read().strip())
open(R+'web/index.html','w',encoding='utf-8').write(html)
print('ok', len(html))
