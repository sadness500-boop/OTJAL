/* OTJAL 웹 버전용 네이버 쇼핑 검색 API 중계 서버 (Cloudflare Workers 무료) — Rat Rae Choi
   1) https://dash.cloudflare.com → Workers & Pages → Create → "Hello World" Worker 생성
   2) 이 파일 내용을 그대로 붙여넣고 Deploy
   3) 발급된 주소(https://이름.계정.workers.dev)를 OTJAL > 맞춤 추천 > 실제 상품 연결 > "중계 서버 주소"에 입력
   네이버 검색 API 주소만 중계하며, API 키는 저장하지 않고 요청마다 그대로 전달합니다. */
export default {
  async fetch(req) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-Naver-Client-Id, X-Naver-Client-Secret, Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const target = new URL(req.url).searchParams.get("url") || "";
    if (!target.startsWith("https://openapi.naver.com/v1/search/")) return new Response("not allowed", { status: 400, headers: cors });
    const r = await fetch(target, { headers: {
      "X-Naver-Client-Id": req.headers.get("X-Naver-Client-Id") || "",
      "X-Naver-Client-Secret": req.headers.get("X-Naver-Client-Secret") || ""
    } });
    return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
  }
};
