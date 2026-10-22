/* ---------- 실제 판매 상품 추천 엔진 (네이버 쇼핑 데이터 기반) — OTJAL · Rat Rae Choi ----------
   사용자는 설정할 것이 없습니다: 개발 단계에서 GitHub Actions가 6시간마다 네이버 쇼핑 검색 API로 실제 상품을 모아 카탈로그(JSON)로 올리고,
   앱은 그 카탈로그를 받아 기기 안에서 "내 스타일" 점수로 1~50위를 매깁니다.
   네이버 쇼핑은 네이버 스마트스토어·11번가·G마켓·옥션·SSG·롯데ON·무신사·29CM·W컨셉·LF몰 등 여러 쇼핑몰 상품을 함께 검색해 줍니다.
   내 스타일(체형·스타일·색상·상황·예산·중요도·쇼핑몰)로 검색어를 만들고, 받아온 실제 상품을 OTJAL 점수로 다시 매겨 1~50위로 보여줍니다. */
const Shop = (() => {
  const CK = "otjal-cat-v1", TTL = 12*3600*1000;
  const api = () => (S.api ||= {cid:"", csec:"", proxy:""});
  const hasBridge = () => !!(window.OTJALApp && typeof OTJALApp.http === "function");
  const CAT_URL = "https://sadness500-boop.github.io/OTJAL/docs/catalog/";
  const keys = () => { const a=api(); return !!(a.cid && a.csec); };
  let catState = "unknown"; const MEM = {};           // 카탈로그 상태: unknown | ok | missing
  const configured = () => keys() || catState!=="missing";
  const live = () => catState==="ok" || keys();
  let seq=0; const pend={};
  window.__otjalHttp = (id, status, body) => { const p=pend[id]; if (!p) return; delete pend[id];
    (status>=200 && status<300) ? p.res(body) : p.rej(new Error(errMsg(status, body))); };
  function errMsg(status, body){ let m=""; try { m=JSON.parse(body).errorMessage||""; } catch(e){}
    if (status===401) return "Client ID·Secret이 맞지 않아요 (401)"; if (status===403) return "검색 API 사용 설정이 안 되어 있어요 (403)";
    if (status===429) return "오늘 호출 한도를 넘었어요 (429)"; return `오류 ${status}${m?" · "+m:""}`; }
  function get(url){ const a=api(), H={"X-Naver-Client-Id":a.cid.trim(), "X-Naver-Client-Secret":a.csec.trim()};
    if (hasBridge()) return new Promise((res,rej)=>{ const id="h"+(++seq); pend[id]={res,rej}; OTJALApp.http(id, url, JSON.stringify(H));
      setTimeout(()=>{ if (pend[id]){ delete pend[id]; rej(new Error("응답 시간이 초과됐어요")); } }, 20000); }).then(t=>JSON.parse(t));
    const u = a.proxy ? a.proxy.trim().replace(/\/+$/,"")+"/?url="+encodeURIComponent(url) : url;
    return fetch(u,{headers:H}).then(async r=>{ if (!r.ok) throw new Error(errMsg(r.status, await r.text().catch(()=>""))); return r.json(); })
      .catch(e=>{ if (/Failed to fetch|NetworkError|Load failed/i.test(String(e))) throw new Error(a.proxy?"중계 서버에 연결하지 못했어요":"웹 브라우저는 보안 정책(CORS) 때문에 직접 호출할 수 없어요 — Android 앱을 쓰거나 중계 서버 주소를 넣어 주세요"); throw e; }); }
  const search = (q, display=100, start=1, sort="sim") => get(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(q)}&display=${display}&start=${start}&sort=${sort}&exclude=used:rental:cbshop`);

  /* ---- 상품 → OTJAL 아이템으로 해석 ---- */
  const strip = s => String(s||"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\s+/g," ").trim();
  const CW = [[/아이보리|크림|오프화이트/,"ivory"],[/화이트|흰색|white/i,"white"],[/블랙|검정|black/i,"black"],[/멜란지/,"melange"],[/차콜/,"charcoal"],[/그레이|회색|gray|grey/i,"gray"],
    [/네이비|곤색|navy/i,"navy"],[/베이지|오트밀|샌드|beige/i,"beige"],[/연청|라이트\s?블루\s?데님|라이트\s?데님/,"lightdenim"],[/중청|진청|데님|청바지|생지/,"denim"],[/카멜|camel/i,"camel"],
    [/브라운|갈색|모카|초코|코코아/,"brown"],[/카키|khaki/i,"khaki"],[/올리브/,"olive"],[/옐로|노랑|버터|레몬/,"butter"],[/코랄|살구|피치/,"coral"],[/핑크|분홍|pink/i,"pink"],
    [/라벤더|퍼플|보라|바이올렛/,"lavender"],[/스카이|하늘|소라/,"sky"],[/민트/,"mint"],[/세이지|그린|초록|녹색|green/i,"sage"],[/버건디|와인/,"burgundy"],[/레드|빨강|red/i,"red"]];
  const STYKW = { 러블리:/러블리|리본|프릴|퍼프|레이스|하트|플라워|꽃|큐트/, 꾸안꾸:/데일리|베이직|루즈|꾸안꾸|무지|오버핏/, 미니멀:/미니멀|베이직|무지|심플|클래식|모던/,
    페미닌:/페미닌|플리츠|셔링|블라우스|원피스|트위드|실크|새틴|슬림/, 오피스:/오피스|정장|슬랙스|블라우스|셔츠|블레이저|자켓|재킷|출근|세미/, 캐주얼:/캐주얼|맨투맨|후드|데님|청바지|티셔츠|스니커즈|트레이닝/,
    스트릿:/스트릿|그래픽|로고|카고|빅사이즈|와이드/, Y2K:/y2k|크롭|로우라이즈|카고|글리터|레트로/i, 스포티:/트레이닝|조거|레깅스|러닝|스포츠|애슬레저|져지|바람막이/,
    댄디:/댄디|셔츠|슬랙스|블레이저|니트|코트|로퍼|카라/, 시티보이:/시티보이|오버핏|와이드|스트라이프|셔츠|코튼/, 아메카지:/아메카지|워크|초어|헤링본|코듀로이|데님|체크/, 고프코어:/고프코어|바람막이|아노락|윈드|아웃도어|플리스|등산/ };
  const OCCKW = { 출근:/오피스|정장|슬랙스|블라우스|셔츠|블레이저|자켓|재킷|로퍼|코트|니트|세미/, 데이트:/원피스|러블리|플라워|블라우스|스커트|가디건|니트|트위드/, 일상:/데일리|맨투맨|티셔츠|청바지|데님|후드|스니커즈|가디건|베이직/,
    여행:/스니커즈|맨투맨|후드|데님|바람막이|크로스백|와이드|티셔츠/, 운동:/트레이닝|레깅스|조거|러닝|스포츠|바람막이|애슬레저/, 하객:/트위드|원피스|블라우스|자켓|플리츠|펌프스|슬링백|셋업/, 면접:/정장|블레이저|슬랙스|셔츠|블라우스|구두|로퍼|셋업/ };
  const BAD = /아동|키즈|주니어|유아|베이비|임부|임산부|속옷|팬티|브라|잠옷|파자마|홈웨어|수영복|래쉬가드|코스프레|커플티|단체|작업복|유니폼|덧신|양말|스타킹|마스크|인형/;
  function catShape(x, t){ const c3=x.category3||"", c4=x.category4||"", c=`${x.category2||""}>${c3}>${c4}`;
    if (/신발/.test(c)) return /가방|지갑/.test(c)?null:["shoes","shoes"];
    if (/가방/.test(c)) return ["bag","bag"];
    if (/원피스/.test(c)) return ["dress","dress"];
    if (/스커트|치마/.test(c+t)&&!/바지|팬츠/.test(c3)) return ["bottom", /롱|맥시|미디/.test(t)?"skirt-l":"skirt-m"];
    if (/바지|팬츠|청바지|레깅스|슬랙스|쇼츠|반바지/.test(c)) return ["bottom", /반바지|쇼츠|숏팬츠|3부|5부/.test(t)?"pants-sh": /와이드|벌룬|배기|세미와이드/.test(t)?"pants-w":"pants-s"];
    if (/코트|재킷|자켓|점퍼|패딩|야상|블루종|사파리|무스탕|바람막이|아노락|플리스/.test(c)) return ["outer", /숏|크롭|하프|블레이저|자켓|재킷|점퍼|블루종|바람막이|아노락/.test(t+c4)&&!/롱/.test(t) ? "outer-s" : /코트|롱|트렌치|발마칸/.test(t+c) ? "outer-l" : "outer-s"];
    if (/니트|스웨터|티셔츠|블라우스|셔츠|남방|맨투맨|후드|가디건|탑|나시|조끼|베스트|카라티/.test(c)) return ["top", /반팔|반소매|민소매|나시|슬리브리스|캐미|크롭 ?티|5부/.test(t)?"top-s":"top-l"];
    return null; }
  function genderOf(x, t){ const c=x.category2||""; if (/여성/.test(c)) return "F"; if (/남성/.test(c)) return "M"; if (/여성|우먼|여자|레이디/.test(t)) return "F"; if (/남성|남자|맨즈|mens/i.test(t)) return "M"; return "U"; }
  function toItem(x, g, q, qrank){ const t=strip(x.title); if (!t || BAD.test(t) || !/패션의류|패션잡화/.test(x.category1||"")) return null;
    const gg=genderOf(x,t); if (gg!=="U" && gg!==g) return null;
    const cs=catShape(x,t); if (!cs || (cs[0]==="dress" && g==="M")) return null;
    const price=+x.lprice||0; if (price<5000) return null;
    const p=S.profile[g], found=[]; for (const [re,k] of CW){ const m=t.search(re); if (m>=0) found.push([m,k]); }
    found.sort((a,b)=>a[0]-b[0]); const colors=[...new Set(found.map(f=>f[1]))];
    let color = colors.find(c=>p.colors.includes(c)) || colors.find(c=>!(p.avoidColors||[]).includes(c)) || colors[0] || (cs[1].startsWith("pants")&&/데님|청/.test(t)?"denim":cs[0]==="shoes"||cs[0]==="bag"?"black":"beige");
    const fit = /오버|루즈|박시|오버사이즈|빅사이즈/.test(t) ? "over" : /슬림|스키니|타이트|머슬|일자핏/.test(t) ? "slim" : (cs[1]==="pants-w"?"over":"regular");
    const styles=Object.keys(STYKW).filter(s=>STYLES[g].includes(s) && STYKW[s].test(t));
    const occ=Object.keys(OCCKW).filter(o=>OCCKW[o].test(t)); if (!occ.includes("일상")) occ.push("일상");
    const seasons = /린넨|반팔|반소매|쿨|시어서커|나시|썸머|여름|민소매/.test(t) ? ["봄","여름"] : /패딩|다운|기모|울|캐시미어|코트|플리스|무스탕|퍼|겨울|헤비/.test(t) ? ["가을","겨울"] : /니트|가디건|트렌치|자켓|재킷|스웨트|맨투맨/.test(t) ? ["봄","가을","겨울"] : ["봄","여름","가을","겨울"];
    const short = t.replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g," ").replace(/\s+/g," ").trim();
    return { id:"N"+x.productId, name: short.length>46 ? short.slice(0,45)+"…" : short, full:t, shape:cs[1], cat:cs[0], color, colors, fit, styles, occ, seasons, price,
      kw:short, g, img:x.image, link:x.link, mall:x.mallName||"", brand:x.brand||x.maker||"", real:1, q, qrank, c3:x.category3||"" }; }

  /* ---- 내 스타일 → 검색어 ---- */
  const TERMS = { F:{top:["니트","블라우스","셔츠","티셔츠","가디건","맨투맨"],bottom:["슬랙스","와이드팬츠","청바지","롱스커트","미니스커트"],dress:["원피스","니트원피스"],outer:["자켓","트렌치코트","코트","패딩"],shoes:["로퍼","스니커즈","플랫슈즈","앵클부츠"],bag:["숄더백","토트백"]},
                  M:{top:["니트","셔츠","티셔츠","맨투맨","후드티"],bottom:["슬랙스","청바지","치노팬츠","와이드팬츠"],outer:["블레이저","코트","자켓","패딩"],shoes:["스니커즈","로퍼","더비슈즈"],bag:["크로스백","백팩"]} };
  const STYQ = {러블리:"러블리",꾸안꾸:"데일리",미니멀:"베이직",페미닌:"페미닌",오피스:"오피스룩",캐주얼:"캐주얼",스트릿:"스트릿",Y2K:"y2k",스포티:"트레이닝",댄디:"댄디",시티보이:"오버핏",아메카지:"아메카지",고프코어:"고프코어"};
  function queries(g){ const p=S.profile[g], gw=g==="F"?"여성":"남성", season=p.season, T=TERMS[g], out=[];
    const seasonal = (c,list)=> c==="outer" ? list.filter(t=> season==="여름" ? !/패딩|코트/.test(t) : season==="겨울" ? true : !/패딩/.test(t)) : c==="top" && season==="여름" ? ["반팔 티셔츠","린넨 셔츠",...list.slice(1,4)] : list;
    for (const c of Object.keys(T)) for (const t of seasonal(c,T[c])) out.push(`${gw} ${t}`);
    const cols=p.colors.slice(0,2).map(c=>COLORS[c].n.replace("소프트","").replace("데님블루","데님"));
    for (const col of cols) for (const c of ["top","bottom","outer"]) out.push(`${gw} ${col} ${seasonal(c,T[c])[0]}`);
    for (const s of p.styles.slice(0,2)) if (STYQ[s]) for (const c of ["top","bottom",g==="F"?"dress":"outer"]) out.push(`${gw} ${STYQ[s]} ${seasonal(c,T[c])[0]}`);
    return [...new Set(out)].slice(0,30); }
  const sigOf = g => { const p=S.profile[g]; return [g,p.season,p.styles.slice(0,2).join(","),p.colors.slice(0,2).join(","),p.occ.slice(0,2).join(",")].join("|"); };

  /* ---- 캐시 ---- */
  let C = (()=>{ try { return JSON.parse(localStorage.getItem(CK)||"{}"); } catch(e){ return {}; } })();
  const persist = () => { try { localStorage.setItem(CK, JSON.stringify(C)); } catch(e){ try { for (const g in C) C[g].items=C[g].items.slice(0,240); localStorage.setItem(CK, JSON.stringify(C)); } catch(_){} } };
  const has = g => !!(C[g] && C[g].items && C[g].items.length);
  const info = g => C[g] ? {at:C[g].at, n:C[g].total||C[g].items.length, sig:C[g].sig, queries:C[g].nq, src:C[g].src, updated:C[g].updated} : null;

  /* ---- 쇼핑몰 설정 반영 ---- */
  const MALL = [[/무신사/,"musinsa"],[/29cm/i,"29cm"],[/w컨셉|wconcept/i,"wconcept"],[/lf ?몰|lfmall/i,"lfmall"],[/ssf/i,"ssfshop"],[/ssg|신세계|이마트/i,"ssg"],[/롯데/,"lotteon"],[/gs ?shop|gs샵/i,"gsshop"],
    [/cj ?온스타일|cjonstyle/i,"cjonstyle"],[/g마켓|gmarket/i,"gmarket"],[/옥션|auction/i,"auction"],[/11번가/,"11st"],[/쿠팡|coupang/i,"coupang"],[/패션플러스/,"fashionplus"],[/하프클럽/,"halfclub"],[/유니클로/,"uniqlo"],
    [/에이블리/,"ably"],[/브랜디/,"brandi"],[/지그재그/,"zigzag"],[/하이버/,"hiver"]];
  const siteOfMall = m => { for (const [re,id] of MALL) if (re.test(m)) return id; return "naverplus"; };
  const allowed = it => { const sid=siteOfMall(it.mall); return S.sites.includes(sid) || (sid==="naverplus" && (S.sites.includes("naver")||S.sites.includes("naverplus"))); };

  /* ---- 카탈로그 (개발 단계에서 자동 수집된 실제 상품) ---- */
  async function loadCatalog(g){ if (MEM[g] && Date.now()-MEM[g].t < 30*60*1000) return MEM[g];
    const r = await fetch(CAT_URL+g+".json", {cache:"no-cache"}); if (!r.ok) throw new Error("catalog "+r.status);
    const j = await r.json(), out=[];
    (j.items||[]).forEach(x=>{ const it=toItem({productId:x.id,title:x.t,image:x.img,link:x.l,lprice:x.p,mallName:x.m,brand:x.b,category1:"패션의류",category2:x.c2,category3:x.c3,category4:x.c4}, g, x.q, x.r); if (it) out.push(it); });
    catState="ok"; return MEM[g]={t:Date.now(), updated:j.updated, items:out}; }
  async function fromCatalog(g){ prog={g,done:0,total:1,err:""}; emit(); const c=await loadCatalog(g); prog.done=1; emit(); return {items:c.items, updated:c.updated}; }

  /* ---- 불러오기 ---- */
  let busy=null; const listeners=new Set(); let prog={g:null,done:0,total:0,err:""};
  const emit = () => listeners.forEach(f=>{ try { f(prog); } catch(e){} });
  async function refresh(g, force){
    if (busy) return busy;
    busy=(async()=>{
      if (!keys() || catState!=="missing"){ try { const c=await fromCatalog(g); return finish(g, c.items, "catalog", c.updated); }
        catch(e){ catState="missing"; if (!keys()){ prog.err="실제 상품 데이터를 준비 중이에요"; emit(); throw new Error(prog.err); } } }
      const qs=queries(g); prog={g,done:0,total:qs.length,err:""}; emit();
      const seen=new Map(); let fails=0, lastErr=null;
      const worker=async()=>{ while(qs.length){ const q=qs.shift(); try { const r=await search(q,100);
            (r.items||[]).forEach((x,i)=>{ const it=toItem(x,g,q,i); if (!it) return; const prev=seen.get(it.id); if (!prev || prev.qrank>i) seen.set(it.id,it); }); }
          catch(e){ fails++; lastErr=e; if (/401|403|429|CORS|중계/.test(e.message)) { qs.length=0; } }
          prog.done++; emit(); } };
      await Promise.all([worker(),worker(),worker()]);
      if (!seen.size){ prog.err=lastErr?lastErr.message:"조건에 맞는 상품을 찾지 못했어요"; emit(); throw lastErr||new Error(prog.err); }
      // 같은 상품 다른 판매자(제목 거의 같음) 정리
      return finish(g, [...seen.values()], "api", null); })();
    try { return await busy; } finally { busy=null; } }
  function finish(g, list, src, updated){
      const byT=new Map(); for (const it of list){ const k=it.kw.replace(/[^가-힣a-z0-9]/gi,"").slice(0,22)+it.cat; const o=byT.get(k); if (!o || it.price<o.price) byT.set(k,it); }
      const items=[...byT.values()]; const p=S.profile[g];
      items.forEach(it=>{ it.pre=score(it,p).total; }); items.sort((a,b)=>b.pre-a.pre);
      C[g]={sig:sigOf(g), at:Date.now(), nq:prog.total, src, updated, total:items.length, items:items.slice(0, src==="catalog"?600:360)}; persist(); apply(g); return C[g]; }
  const stale = g => !has(g) || C[g].sig!==sigOf(g) || Date.now()-C[g].at>(C[g].src==="catalog"?3*3600*1000:TTL);
  function auto(g){ if (configured() && stale(g) && !busy) refresh(g).then(()=>{ if (typeof render==="function") render(); }).catch(()=>{ if (typeof render==="function") render(); }); }

  /* ---- 앱 카탈로그에 적용 ---- */
  function apply(g){ if (!has(g)) { ITEMS[g]=EXAMPLE[g]; return false; }
    ITEMS[g]=C[g].items.filter(allowed); for (const it of C[g].items) BYID[it.id]=it; return true; }
  function rankTop(g, n=50, cat){ const p=S.profile[g]; let R=ranked(g).filter(x=>!cat||x.it.cat===cat);
    R=R.map(x=>({...x, adj:x.sc.total + Math.max(0,3-(x.it.qrank||0)/20)})); R.sort((a,b)=>b.adj-a.adj);
    if (cat) return R.slice(0,n);
    // 종류·판매처가 한쪽으로 몰리지 않도록 같은 종류가 이어질수록 점수를 조금씩 낮춰 고름
    const out=[], cc={}, mc={}, pool=R.slice(0,400);
    while (out.length<n && pool.length){ let bi=0, bv=-1e9;
      for (let i=0;i<pool.length;i++){ const x=pool[i], v=x.adj-2.2*(cc[x.it.cat]||0)-1.2*(mc[x.it.mall]||0); if (v>bv){ bv=v; bi=i; } }
      const x=pool.splice(bi,1)[0]; cc[x.it.cat]=(cc[x.it.cat]||0)+1; mc[x.it.mall]=(mc[x.it.mall]||0)+1; out.push(x); }
    return out; }
  async function similar(it, n=8){ // 예시/실제 상품과 비슷한 실제 상품을 바로 검색
    const g=it.g, gw=g==="F"?"여성":"남성", isCol=w=>CW.some(([re])=>re.test(w));
    const words=it.kw.split(" ").filter(w=>w && !/여성|남성|\/|\d/.test(w) && !isCol(w));
    const q=it.real ? `${gw} ${words.slice(-3).join(" ")}` : `${gw} ${COLORS[it.color].n.replace("소프트","")} ${it.kw}`;
    const p=S.profile[g];
    if (!keys()){ const c=await loadCatalog(g), tok=words.concat(it.kw.split(" ")).filter(w=>w.length>1);
      return c.items.filter(x=>x.id!==it.id && x.cat===it.cat && (it.real || x.shape===it.shape || true)).filter(allowed)
        .map(x=>{ const ov=tok.reduce((a,w)=>a+(x.kw.includes(w)?1:0),0)+(x.shape===it.shape?1.5:0)+(x.color===it.color?1:0); if (!BYID[x.id]) BYID[x.id]=x; return {it:x, sc:score(x,p), ov}; })
        .sort((a,b)=>(b.ov*6+b.sc.total)-(a.ov*6+a.sc.total)).slice(0,n); }
    const r=await search(q,60);
    return (r.items||[]).map((x,i)=>toItem(x,g,q,i)).filter(x=>x && x.id!==it.id && x.cat===it.cat).filter(allowed).map(x=>{ if (!BYID[x.id]) BYID[x.id]=x; return {it:x, sc:score(x,p)}; }).sort((a,b)=>b.sc.total-a.sc.total).slice(0,n); }
  async function find(text, g, n=20){ const gw=g==="F"?"여성":"남성", q=/여성|남성/.test(text)?text:`${gw} ${text}`; const p=S.profile[g];
    if (!keys()){ const c=await loadCatalog(g), tok=text.split(/\s+/).filter(w=>w.length>0);
      const res=c.items.filter(x=>tok.every(w=>x.full.includes(w)||x.kw.includes(w))).filter(allowed); for (const it of res) BYID[it.id]=it;
      return res.map(x=>({it:x, sc:score(x,p)})).sort((a,b)=>b.sc.total-a.sc.total).slice(0,n); }
    const r=await search(q,100);
    const res=(r.items||[]).map((x,i)=>toItem(x,g,q,i)).filter(Boolean).filter(allowed); for (const it of res) BYID[it.id]=it;
    return res.map(x=>({it:x, sc:score(x,p)})).sort((a,b)=>b.sc.total-a.sc.total).slice(0,n); }
  async function test(){ const r=await search("여성 니트",1); return (r.total||0); }
  return { configured, live, keys, catalogState:()=>catState, hasBridge, refresh, auto, apply, has, info, rankTop, similar, find, test, stale, on:f=>listeners.add(f), prog:()=>prog, busy:()=>!!busy, siteOfMall };
})();
