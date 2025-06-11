#!/bin/bash

# Development 빌드 스크립트
echo "Building Prompt Navigator for development..."

# 디버그 디렉토리 생성
mkdir -p .debug

# content.js를 복사하고 PRODUCTION_MODE를 false로 확인 (이미 false이므로 그대로 복사)
cp content.js .debug/

# 나머지 파일들 복사
cp manifest.json .debug/
cp content.css .debug/
cp background.js .debug/
cp popup.html .debug/
cp popup.js .debug/
cp popup.css .debug/
cp -r icons .debug/

echo "Development build completed in .debug/ directory"
echo "Debug logs are enabled in development mode"

# ZIP 파일 생성 (선택사항)
if command -v zip &> /dev/null; then
    cd .debug
    zip -r ../prompt-navigator-development.zip .
    cd ..
    echo "Created prompt-navigator-development.zip"
fi