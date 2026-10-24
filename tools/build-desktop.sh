#!/bin/sh
# OTJAL PC 프로그램(Windows) 빌드 — Rat Rae Choi
# docs/(웹앱)를 실행 파일 안에 넣어 단일 OTJAL.exe 로 만든다. Go 1.22+ 필요(리눅스에서 교차 컴파일).
set -e
cd "$(dirname "$0")/../desktop"
VER=$(grep -o 'APP_VERSION = "[0-9.]*"' ../web/index.html | grep -o '[0-9.]*')
rm -rf www && cp -r ../docs www && rm -rf www/catalog
GOPROXY=${GOPROXY:-direct} GOSUMDB=off GOFLAGS=-mod=mod GOOS=windows GOARCH=amd64 \
  go build -trimpath -ldflags "-s -w -H windowsgui" -o "../release/OTJAL-PC-v$VER.exe" .
cp "../release/OTJAL-PC-v$VER.exe" ../release/OTJAL-PC.exe
rm -rf www
echo "OK → release/OTJAL-PC-v$VER.exe"
