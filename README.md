# OTJAL

**나에게 잘 맞는 옷, OTJAL이 찾아준다.**
AI 개인 맞춤형 의류 추천·3D 가상 피팅·쇼핑 연결 서비스 — 현재 버전 **v0.3.0**

## 📱 Android 앱 다운로드

- **[OTJAL.apk 내려받기](https://github.com/sadness500-boop/OTJAL/raw/main/release/OTJAL.apk)** (항상 최신 버전)
- 버전별 파일: [`release/`](release/) 폴더 (예: `OTJAL-v0.3.0.apk`)
- Android 5.0 이상 · 설치 시 "출처를 알 수 없는 앱 설치"를 한 번 허용해야 해요. iPhone은 아직 지원하지 않아요.

## 주요 기능

| 화면 | 내용 |
|---|---|
| 오늘의 PICK | 상황(출근·데이트·여행 등)을 고르면 코디 한 벌을 골라 3D 피규어에 입혀 보여줌 |
| 내 스타일 | 체형 14개 항목(키·몸무게·어깨·가슴·가슴밑·팔뚝·팔길이·허리·엉덩이·허벅지·종아리·다리길이·발·발볼), 골격·어깨 형태·피부톤·헤어, 부위별 핏·기장·패턴·소재·피하는 색/아이템, 종류별 예산, 추천 기준 중요도 |
| 맞춤 추천 | 옷 종류별 TOP 3, 추천 이유·점수, 카드마다 3D 착용 미리보기 |
| 상세 | 소재·핏·시즌·세탁·사이즈 실측표, 정면·측면·후면 3D 착용 이미지, 24개 쇼핑몰 검색 연결 |
| 피팅룸 | 내 체형 3D 피규어에 사이즈별로 입혀 보기(360° 회전), 부위별 핏 표시 |
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
web/index.html        앱 화면 전체 (단일 파일, 웹 버전)
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

- three.js (MIT) · qrcode-generator (MIT)
- Designed & Developed by **Rat Rae Choi**
