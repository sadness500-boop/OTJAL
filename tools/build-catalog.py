# OTJAL 실제 판매 상품 카탈로그 생성기 — Rat Rae Choi
# GitHub Actions에서 실행(6시간마다 + data/curated.csv 수정 시): 아래 두 출처의 실제 상품을 모아 docs/catalog/F.json, M.json 으로 저장.
#   ① 쿠팡 파트너스 Open API (저장소 Secrets: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY 가 있을 때)
#   ③ 운영자 추천 상품 목록 data/curated.csv (항상)
# 앱은 이 파일을 받아 사용자 기기에서 "내 스타일" 점수로 1~50위를 매깁니다. 사용자는 아무 설정도 하지 않습니다.
import csv, datetime, hashlib, hmac, io, json, os, re, sys, time, urllib.parse, urllib.request
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "docs", "catalog"); os.makedirs(OUT, exist_ok=True)
KST = datetime.timezone(datetime.timedelta(hours=9)); NOW = datetime.datetime.now(KST)
CAT_KW = [("dress", r"원피스"), ("bag", r"백팩|가방|숄더백|토트백|크로스백|클러치|브리프케이스|에코백"),
          ("shoes", r"운동화|스니커즈|로퍼|구두|부츠|샌들|슬리퍼|플랫|펌프스|힐|슬링백|메리제인|러닝화|더비"),
          ("outer", r"코트|자켓|재킷|점퍼|패딩|블레이저|야상|바람막이|아노락|플리스|무스탕|베스트|조끼"),
          ("bottom", r"바지|팬츠|슬랙스|청바지|데님 팬츠|스커트|치마|레깅스|쇼츠|반바지|조거"),
          ("top", r"니트|스웨터|티셔츠|셔츠|블라우스|맨투맨|후드|가디건|카디건|나시|탑|폴로|카라티")]
KCAT = {"상의":"top","하의":"bottom","원피스":"dress","아우터":"outer","신발":"shoes","가방":"bag"}
BAD = re.compile(r"아동|키즈|주니어|유아|베이비|임부|속옷|팬티|브라|잠옷|파자마|수영복|양말|스타킹|마스크|커플티")
def guess_cat(t):
    for k, pat in CAT_KW:
        if re.search(pat, t): return k
    return ""
def guess_g(t, default=""):
    if re.search(r"여성|여자|우먼|레이디", t): return "F"
    if re.search(r"남성|남자|맨즈|mens", t, re.I): return "M"
    return default
def hints(g, k, t):  # 앱의 분류기가 읽는 카테고리 문자열 (c2/c3)
    gw = "여성" if g == "F" else "남성"
    if k == "shoes": return gw+"신발", "신발"
    if k == "bag": return gw+"가방", "가방"
    if k == "dress": return gw+"의류", "원피스"
    if k == "bottom": return gw+"의류", "스커트" if re.search(r"스커트|치마", t) else "바지"
    if k == "outer": return gw+"의류", "코트" if re.search(r"코트", t) else "재킷"
    return gw+"의류", "티셔츠"

items = {"F": {}, "M": {}}
def add(g, rec):
    if g in items and rec["p"] >= 3000 and not BAD.search(rec["t"]): items[g].setdefault(rec["id"], rec)

# ③ 운영자 추천 상품 (data/curated.csv)
cur = 0
path = os.path.join(ROOT, "data", "curated.csv")
if os.path.exists(path):
    rows = [l for l in io.open(path, encoding="utf-8-sig").read().splitlines() if l.strip() and not l.lstrip().startswith("#")]
    for i, r in enumerate(csv.DictReader(rows)):
        try:
            t = (r.get("상품명") or "").strip(); url = (r.get("상품주소") or "").strip()
            if not t or not url.startswith("http"): continue
            gtxt = (r.get("성별") or "").strip(); g = "F" if gtxt.startswith("여") or gtxt.upper() == "F" else "M" if gtxt.startswith("남") or gtxt.upper() == "M" else guess_g(t, "F")
            k = KCAT.get((r.get("종류") or "").strip()) or guess_cat(t)
            if not k: print("종류를 알 수 없어 건너뜀:", t); continue
            col = (r.get("색상") or "").strip(); title = f"{t} {col}".strip()
            c2, c3 = hints(g, k, title)
            add(g, {"id": "C" + hashlib.md5(url.encode()).hexdigest()[:12], "t": title, "img": (r.get("이미지주소") or "").strip(), "l": url,
                    "p": int(re.sub(r"[^\d]", "", r.get("가격") or "0") or 0), "m": (r.get("쇼핑몰") or "").strip() or "추천 쇼핑몰",
                    "b": (r.get("브랜드") or "").strip(), "c2": c2, "c3": c3, "c4": "", "q": "운영자 추천", "r": i, "s": "curated"}); cur += 1
        except Exception as e: print("건너뜀:", r, e)
print("운영자 추천 상품", cur, "개")

# ① 쿠팡 파트너스 Open API
AK, SK = os.environ.get("COUPANG_ACCESS_KEY", "").strip(), os.environ.get("COUPANG_SECRET_KEY", "").strip()
STORE = os.path.join(OUT, "_coupang.json")   # 검색 호출 한도(1시간 10회)가 있어 결과를 쌓아 두고 10일 지나면 버림
store = json.load(open(STORE, encoding="utf-8")) if os.path.exists(STORE) else {}
def cp_get(path_qs):
    path, _, qs = path_qs.partition("?")
    dt = time.strftime("%y%m%dT%H%M%SZ", time.gmtime())
    sig = hmac.new(SK.encode(), (dt + "GET" + path + qs).encode(), hashlib.sha256).hexdigest()
    req = urllib.request.Request("https://api-gateway.coupang.com" + path_qs, headers={
        "Authorization": f"CEA algorithm=HmacSHA256, access-key={AK}, signed-date={dt}, signature={sig}", "Content-Type": "application/json;charset=UTF-8"})
    with urllib.request.urlopen(req, timeout=20) as r: return json.loads(r.read().decode("utf-8"))
def cp_add(g, p, q, rank):
    t = re.sub(r"\s+", " ", str(p.get("productName", ""))).strip(); g = guess_g(t, g)
    k = guess_cat(t)
    if not k or not t: return
    c2, c3 = hints(g, k, t)
    store[str(p.get("productId"))] = {"id": "CP" + str(p.get("productId")), "g": g, "t": t, "img": p.get("productImage", ""), "l": p.get("productUrl", ""),
        "p": int(p.get("productPrice") or 0), "m": "쿠팡", "b": "", "c2": c2, "c3": c3, "c4": "", "q": q, "r": rank, "s": "coupang", "seen": NOW.isoformat()}
if AK and SK:
    BASE = "/v2/providers/affiliate_open_api/apis/openapi/products"
    for g, cid in (("F", 1001), ("M", 1002)):   # 여성패션 / 남성패션 베스트
        try:
            d = cp_get(f"{BASE}/bestcategories/{cid}?limit=100")
            for i, p in enumerate(d.get("data") or []): cp_add(g, p, "쿠팡 베스트", i)
        except Exception as e: print("쿠팡 베스트 실패", cid, e)
    KW = ["여성 니트","여성 블라우스","여성 슬랙스","여성 원피스","여성 자켓","여성 코트","여성 스커트","여성 청바지","여성 가디건","여성 로퍼","여성 스니커즈","여성 숄더백",
          "남성 셔츠","남성 니트","남성 슬랙스","남성 청바지","남성 자켓","남성 코트","남성 맨투맨","남성 스니커즈","남성 로퍼","남성 크로스백","여성 패딩","남성 패딩"]
    start = (NOW.timetuple().tm_yday * 4 + NOW.hour // 6) * 9 % len(KW)
    for j in range(9):                                # 실행마다 키워드 9개씩 돌아가며 검색 (한도 10회/시간)
        kw = KW[(start + j) % len(KW)]
        try:
            d = cp_get(f"{BASE}/search?keyword={urllib.parse.quote(kw)}&limit=10")
            for i, p in enumerate((d.get("data") or {}).get("productData") or []): cp_add("F" if kw.startswith("여성") else "M", p, kw, i)
        except Exception as e: print("쿠팡 검색 실패", kw, e)
        time.sleep(1)
    cutoff = NOW - datetime.timedelta(days=10)
    store = {k: v for k, v in store.items() if datetime.datetime.fromisoformat(v["seen"]) >= cutoff}
    json.dump(store, open(STORE, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
else:
    print("쿠팡 파트너스 키가 아직 없어요 — 운영자 추천 상품만 반영합니다.")
for v in store.values():
    rec = {k: v[k] for k in ("id","t","img","l","p","m","b","c2","c3","c4","q","r","s")}; add(v.get("g","F"), rec)

meta = {"updated": NOW.isoformat(timespec="minutes"), "sources": {"curated": cur, "coupang": len(store)}, "genders": {}}
for g in ("F", "M"):
    lst = list(items[g].values())
    json.dump({"g": g, "updated": meta["updated"], "items": lst}, open(os.path.join(OUT, f"{g}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    meta["genders"][g] = len(lst); print(g, len(lst), "개")
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
