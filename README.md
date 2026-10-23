# OTJAL

**나에게 잘 맞는 옷, OTJAL이 찾아준다.**
AI 개인 맞춤형 의류 추천·3D 실사 바디 가상 피팅·쇼핑 연결 서비스 — 현재 버전 **v0.6.4**

## 🌐 웹 버전 (크롬·엣지·사파리)

- **https://sadness500-boop.github.io/OTJAL/** — GitHub Pages (자동으로 웹앱 `docs/`로 이동)
- 크롬·엣지에서 주소창의 설치 아이콘을 누르면 PC·휴대폰에 앱처럼 설치돼요(PWA). 한 번 열면 오프라인에서도 동작합니다.
- 웹 파일: [`docs/`](docs/) · 빌드: `python3 tools/build-web.py`

## 📱 Android 앱 다운로드

- **[OTJAL.apk 내려받기](https://github.com/sadness500-boop/OTJAL/raw/main/release/OTJAL.apk)** (항상 최신 버전)
- 버전별 파일: [`release/`](release/) 폴더 (예: `OTJAL-v0.6.4.apk`)
- Android 5.0 이상 · 설치 시 "출처를 알 수 없는 앱 설치"를 한 번 허용해야 해요. iPhone은 아직 지원하지 않아요.

## 주요 기능

| 화면 | 내용 |
|---|---|
| 오늘의 PICK | 상황(출근·데이트·여행 등)을 고르면 코디 한 벌을 골라 3D 실사 바디에 입혀 보여줌 |
| 내 스타일 | 체형 14개 항목(키·몸무게·어깨·가슴·가슴밑·팔뚝·팔길이·허리·엉덩이·허벅지·종아리·다리길이·발·발볼), 골격·어깨 형태·피부톤·헤어, 부위별 핏·기장·패턴·소재·피하는 색/아이템, 종류별 예산, 추천 기준 중요도 |
| 맞춤 추천 | 옷 종류별 TOP 3, 추천 이유·점수, 카드마다 3D 착용 미리보기 |
| 상세 | 소재·핏·시즌·세탁·사이즈 실측표, 정면·측면·후면 3D 착용 이미지, 24개 쇼핑몰 검색 연결 |
| 피팅룸 | 내 치수(키·몸무게·가슴·허리·엉덩이·허벅지 등)로 만든 3D 실사 바디에 사이즈별로 입혀 보기, 정면·측면·후면·360° 회전, 부위별 핏 표시 |
| 상단 메뉴 | 앱 다운로드 QR · 친구 추천(추천코드·공유) · 주간/야간/시스템 화면 |

추천 점수 기본 비율: 취향 30 · 보유 옷 조화 20 · 예산 15 · 체형·핏 15 · 상황·계절 10 · 색상 10 (설정에서 조절 가능)

> MVP 단계라 상품은 추천 로직을 보여주는 **예시 데이터**예요. 실제 상품·가격·재고는 연결된 쇼핑몰의 검색 결과에서 확인하고, 정식 버전에서는 제휴·허가된 상품 데이터로 바뀝니다.

## 연결 쇼핑몰 (24곳)

포털·가격비교: 다음 검색, 다음 쇼핑하우, 네이버 플러스스토어, 네이버 가격비교
오픈마켓: 쿠팡, G마켓, 옥션, 11번가
백화점·종합몰: SSG닷컴, 롯데ON, GS SHOP, CJ온스타일
패션 전문몰: 무신사, 29CM, W컨셉, LF몰, SSF SHOP, 패션플러스, 하프클럽, 유니클로
트렌드 쇼핑앱: 에이블리, 브랜디, 지그재그(여성), 하이버(남성)

## 폴더 구성

```
web/index.html        앱 화면 원본 (단일 파일)
docs/                 웹 버전(PWA) — GitHub Pages 배포용
tools/build-web.py    웹 버전 빌드 스크립트
android/              Android WebView 앱 (Gradle 없이 빌드)
  build-apk.sh        APK 빌드 스크립트
  libs/               3D(three.js r128)·QR 라이브러리 — 앱에 오프라인 포함
release/              서명된 APK
```

## APK 직접 빌드

```bash
sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 openjdk-17-jdk python3
cd android
KEYSTORE=/경로/otjal-release.keystore KS_PASS=비밀번호 ./build-apk.sh
```

업데이트 설치가 이어지려면 항상 같은 서명 키(keystore)로 빌드해야 해요. 키는 저장소에 올리지 않습니다.

## 라이선스 · 크레딧

- three.js (MIT) · qrcode-generator (MIT) · Great Vibes 폰트 (OFL)
- 3D 바디: [MakeHuman](https://github.com/makehumancommunity/makehuman) 기본 메시·체형 타깃·스켈레톤 가중치(CC0 1.0)를 가공해 사용. 피부·눈·머리 텍스처는 OTJAL에서 절차적으로 생성
- Designed & Developed by **Rat Rae Choi**


## 실제 판매 상품 연결 (v0.6.4~)
OTJAL은 **네이버 쇼핑 검색 API**로 네이버 스마트스토어·11번가·G마켓·옥션·SSG·롯데ON·무신사·29CM·W컨셉·LF몰 등 여러 쇼핑몰의 실제 판매 상품을 모으고, "내 스타일"(체형·스타일·색상·상황·예산·추천 기준 중요도·쇼핑몰) 기준으로 점수를 매겨 **1~50위**를 보여줍니다. 카드의 "구매하러 가기"는 해당 상품 페이지로 바로 연결됩니다.

1. [네이버 개발자센터](https://developers.naver.com/apps/#/register) → Application 등록 → 사용 API **검색** → 비로그인 오픈 API 서비스 환경 **WEB**: `https://sadness500-boop.github.io`
2. 발급된 Client ID / Client Secret을 앱의 **맞춤 추천 → 실제 상품 연결**에 입력 (이 기기에만 저장, 하루 25,000회 무료)
3. **Android 앱**은 바로 동작합니다. **웹 버전**은 브라우저 보안(CORS) 때문에 중계 서버가 필요합니다 — `tools/naver-proxy-worker.js`를 Cloudflare Workers(무료)에 올리고 그 주소를 "중계 서버 주소"에 입력하세요.

- 쿠팡처럼 네이버 쇼핑에 상품을 제공하지 않는 쇼핑몰은 결과에 나오지 않을 수 있습니다.
- 가격·재고는 실시간으로 바뀌므로 최종 가격·사이즈표는 판매처에서 확인하세요.## 실제 판매 상품 데이터 (운영자 설정)
사용자는 아무 설정 없이 앱만 열면 됩니다. GitHub Actions(`.github/workflows/catalog.yml`)가 아래 출처의 실제 상품을 모아 `docs/catalog/F.json`, `M.json`으로 올리고, 앱이 각자의 "내 스타일" 기준으로 1~50위를 매깁니다.

- **A. 운영자 추천 목록** — `data/curated.csv`에 한 줄씩 추가(성별, 종류, 상품명, 가격, 쇼핑몰, 상품주소, 이미지주소, 색상, 브랜드). 저장하면 1~2분 안에 반영됩니다.
- **B. 쿠팡 파트너스 Open API** — 최종 승인 후 발급받은 키를 저장소 Secrets `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`에 등록하면 6시간마다 자동 수집합니다(검색 호출 한도 때문에 실행마다 9개 키워드씩 돌아가며 수집, 10일 보관).
- 네이버 쇼핑 검색 API는 2026년 7월 종료되어 더 이상 사용하지 않습니다.
- 쿠팡 상품이 있으면 앱에 파트너스 수수료 안내 문구가 표시됩니다.
