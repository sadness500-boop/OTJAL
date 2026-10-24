#!/usr/bin/env python3
"""OTJAL 안에 '함께 즐기기' 프로그램 3개를 설치(번들)합니다 — Designed & Developed by Rat Rae Choi
web/apps/<id>/index.html 에 'OTJAL로 돌아가기' 버튼을 한 번만 넣습니다(이미 있으면 건너뜀)."""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPS = ["ppopgi", "matgil", "festival"]
MARK = "<!-- OTJAL-BACK -->"
SNIP = MARK + r'''
<style>
#otjalBar{display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top,0px)) 14px 8px;background:#16161A;color:#fff;
  font:600 13px/1.2 "IBM Plex Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;position:relative;z-index:2147483000}
#otjalBackPill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 10px;border-radius:999px;background:#fff;color:#16161A;font-weight:800;text-decoration:none;white-space:nowrap}
#otjalBackPill b{font-family:Georgia,"Times New Roman",serif;letter-spacing:.08em}
#otjalBar span{opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media print{#otjalBar{display:none}}
</style>
<div id="otjalBar"><a id="otjalBackPill" href="../../index.html" aria-label="OTJAL 메인으로 돌아가기">← <b>OTJAL</b></a><span>OTJAL에 설치된 프로그램 · Things to enjoy</span></div>
<script>
(function(){
  var home = "../../index.html";
  window.otjalBack = function(){
    try { if (window.__appBack && window.__appBack()) return true; } catch(e) {}
    location.href = home; return true;
  };
  var bar = document.getElementById("otjalBar");
  if (bar && document.body.firstChild !== bar) document.body.insertBefore(bar, document.body.firstChild);
})();
</script>
'''

def main():
    for a in APPS:
        p = os.path.join(ROOT, "web", "apps", a, "index.html")
        s = open(p, encoding="utf-8").read()
        if MARK in s:
            print("skip", a); continue
        i = s.rfind("</body>")
        assert i > 0, p
        open(p, "w", encoding="utf-8").write(s[:i] + SNIP + s[i:])
        print("installed back button →", a)

if __name__ == "__main__":
    main()
