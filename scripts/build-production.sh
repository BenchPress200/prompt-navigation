#!/bin/bash

# Production 빌드 스크립트
echo "Building Prompt Navigator for production..."

# 빌드 디렉토리 생성
mkdir -p .build

# content.js를 복사하고 PRODUCTION_MODE를 true로 변경
sed 's/const PRODUCTION_MODE = false;/const PRODUCTION_MODE = true;/g' content.js > .build/content.js

# 나머지 파일들 복사
cp manifest.json .build/
cp content.css .build/
cp background.js .build/
cp popup.html .build/
cp popup.js .build/
cp popup.css .build/
cp -r icons .build/

echo "Production build completed in .build/ directory"
echo "Debug logs are disabled in production mode"

# ZIP 파일 생성 (선택사항)
if command -v zip &> /dev/null; then
    cd .build
    zip -r ../prompt-navigator-production.zip .
    cd ..
    echo "Created prompt-navigator-production.zip"
fi