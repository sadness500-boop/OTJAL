# OTJAL 실제 판매 상품 카탈로그 생성기 — Rat Rae Choi
# GitHub Actions에서 6시간마다 실행: 네이버 쇼핑 검색 API로 여러 쇼핑몰의 실제 상품을 모아 docs/catalog/*.json 으로 저장.
# 앱은 이 파일만 읽고 사용자 기기에서 "내 스타일" 점수로 1~50위를 매기므로, 사용자는 아무 설정 없이 바로 씁니다.
import json, os, re, sys, time, urllib.parse, urllib.request, datetime
CID, SEC = os.environ.get("NAVER_CLIENT_ID","").strip(), os.environ.get("NAVER_CLIENT_SECRET","").strip()
if not CID or not SEC: sys.exit("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 설정되지 않았어요 (GitHub 저장소 Settings → Secrets → Actions)")
OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "catalog"); os.makedirs(OUT, exist_ok=True)
TERMS = {
 "F": {"top":["니트","블라우스","셔츠","티셔츠","반팔 티셔츠","가디건","맨투맨","후드티","크롭 니트","린넨 셔츠"],
       "bottom":["슬랙스","와이드팬츠","청바지","부츠컷 데님","롱스커트","미니스커트","플리츠스커트","H라인 스커트","조거팬츠","레깅스"],
       "dress":["원피스","니트원피스","셔츠원피스","플라워 원피스","미니원피스"],
       "outer":["자켓","트위드 자켓","블레이저","트렌치코트","코트","롱코트","숏패딩","롱패딩","바람막이","가디건 자켓"],
       "shoes":["로퍼","스니커즈","플랫슈즈","메리제인","앵클부츠","슬링백","펌프스","샌들"],
       "bag":["숄더백","토트백","크로스백","미니백","백팩"]},
 "M": {"top":["니트","셔츠","옥스포드 셔츠","티셔츠","반팔 티셔츠","맨투맨","후드티","카라티","럭비 셔츠","케이블 니트"],
       "bottom":["슬랙스","청바지","치노팬츠","와이드팬츠","카고팬츠","조거팬츠","반바지"],
       "outer":["블레이저","코트","발마칸 코트","자켓","데님 자켓","숏패딩","롱패딩","바람막이","플리스 자켓"],
       "shoes":["스니커즈","로퍼","더비슈즈","러닝화","첼시부츠"],
       "bag":["크로스백","백팩","토트백","브리프케이스"]}}
COLORS = ["블랙","화이트","아이보리","베이지","그레이","네이비","브라운","카키","핑크","라벤더","스카이블루","데님"]
STYLES = {"F":["러블리","베이직","페미닌","오피스룩","캐주얼","스트릿"],"M":["댄디","베이직","캐주얼","오버핏","스트릿","아메카지"]}
def get(q, start=1):
    url = "https://openapi.naver.com/v1/search/shop.json?" + urllib.parse.urlencode({"query":q,"display":100,"start":start,"sort":"sim","exclude":"used:rental:cbshop"})
    req = urllib.request.Request(url, headers={"X-Naver-Client-Id":CID,"X-Naver-Client-Secret":SEC})
    for t in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r: return json.loads(r.read().decode("utf-8")).get("items",[])
        except urllib.error.HTTPError as e:
            if e.code in (401,403): sys.exit(f"API 키 오류 {e.code}: {e.read().decode('utf-8','ignore')[:200]}")
            time.sleep(1.5*(t+1))
        except Exception: time.sleep(1.5*(t+1))
    return []
strip = lambda s: re.sub(r"\s+"," ",re.sub(r"<[^>]+>","",s or "").replace("&amp;","&").replace("&quot;",'"').replace("&#39;","'").replace("&lt;","<").replace("&gt;",">")).strip()
meta = {"updated": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(timespec="minutes"), "genders":{}}
calls = 0
for g, T in TERMS.items():
    gw = "여성" if g=="F" else "남성"; qs = []
    for cat, terms in T.items():
        for t in terms: qs.append((f"{gw} {t}", 2 if t==terms[0] else 1))
        for col in COLORS: qs.append((f"{gw} {col} {terms[0]}", 1))
        for col in COLORS[:6]: qs.append((f"{gw} {col} {terms[1]}", 1))
    for s in STYLES[g]:
        for cat in ["top","bottom","outer"] + (["dress"] if g=="F" else []): qs.append((f"{gw} {s} {T[cat][0]}", 1))
    seen = {}
    for q, pages in qs:
        for pg in range(pages):
            items = get(q, 1+pg*100); calls += 1; time.sleep(0.12)
            for i, x in enumerate(items):
                if not re.search("패션의류|패션잡화", x.get("category1","")): continue
                pid = x.get("productId"); r = pg*100+i
                if not pid or (pid in seen and seen[pid]["r"] <= r): continue
                seen[pid] = {"id":pid,"t":strip(x.get("title")),"img":x.get("image",""),"l":x.get("link",""),"p":int(x.get("lprice") or 0),
                             "m":x.get("mallName",""),"b":x.get("brand","") or x.get("maker",""),"c2":x.get("category2",""),"c3":x.get("category3",""),"c4":x.get("category4",""),"q":q,"r":r}
    items = sorted([v for v in seen.values() if v["p"] >= 5000], key=lambda v: v["r"])[:5000]   # 검색 상위 상품 위주로 5,000개까지
    with open(os.path.join(OUT, f"{g}.json"), "w", encoding="utf-8") as f: json.dump({"g":g,"updated":meta["updated"],"items":items}, f, ensure_ascii=False, separators=(",",":"))
    meta["genders"][g] = {"items":len(items),"queries":len(qs)}
    print(g, len(qs), "queries →", len(items), "products")
meta["calls"] = calls
with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f: json.dump(meta, f, ensure_ascii=False, indent=1)
print("API calls", calls)
