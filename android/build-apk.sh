#!/usr/bin/env bash
# OTJAL APK build (no Gradle) — Designed & Developed by Rat Rae Choi
# 필요 도구(Ubuntu): sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 openjdk-17-jdk python3
# 사용법: KEYSTORE=경로 KS_PASS=비밀번호 ./build-apk.sh
set -euo pipefail
cd "$(dirname "$0")"
SDK_JAR=${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}
BT=$(ls -d /usr/lib/android-sdk/build-tools/* | sort -V | tail -1)
VER=$(grep -o 'APP_VERSION = "[0-9.]*"' ../web/index.html | grep -o '[0-9][0-9.]*')
CODE=$(echo "$VER" | awk -F. '{print $1*10000+$2*100+$3}')
: "${KEYSTORE:?KEYSTORE 경로가 필요해요}"; : "${KS_PASS:?KS_PASS가 필요해요}"
rm -rf build && mkdir -p build/gen build/obj build/assets/www/lib
cp libs/*.js build/assets/www/lib/
python3 - "$VER" <<'PY'
import sys
src=open('../web/index.html',encoding='utf-8').read()
for a,b in [("https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js","lib/three.min.js"),
            ("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js","lib/OrbitControls.js"),
            ("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js","lib/RoomEnvironment.js"),
            ("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js","lib/qrcode.js")]:
    assert a in src, a; src=src.replace(a,b)
head='<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>html,body{margin:0}body{font-size:14px}img{max-width:100%}[hidden]{display:none!important}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>\n</head><body>\n'
open('build/assets/www/index.html','w',encoding='utf-8').write(head+src+'\n</body></html>\n')
PY
aapt package -f -M AndroidManifest.xml -S res -A build/assets -I "$SDK_JAR" -J build/gen \
  --version-code "$CODE" --version-name "$VER" -F build/otjal.unsigned.apk
javac -source 8 -target 8 -nowarn -Xlint:-options -bootclasspath "$SDK_JAR" -classpath "$SDK_JAR" -d build/obj \
  src/com/ratrae/otjal/*.java $(find build/gen -name R.java)
"$BT/dx" --dex --output=build/classes.dex build/obj
(cd build && aapt add otjal.unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 build/otjal.unsigned.apk build/otjal.aligned.apk
mkdir -p ../release
apksigner sign --v4-signing-enabled false --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --out "../release/OTJAL-v$VER.apk" build/otjal.aligned.apk
cp "../release/OTJAL-v$VER.apk" ../release/OTJAL.apk
apksigner verify --print-certs ../release/OTJAL.apk | head -3
echo "OK → release/OTJAL-v$VER.apk"
