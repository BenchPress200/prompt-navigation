#!/bin/bash

# Chrome Extension Store 배포 자동화 스크립트
# 사용법: ./deploy.sh

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 프로젝트 정보
EXTENSION_NAME="prompt-navigator"
VERSION=$(grep '"version"' manifest.json | cut -d '"' -f 4)

echo -e "${GREEN}Chrome Extension Store 배포 준비${NC}"
echo "Extension: $EXTENSION_NAME"
echo "Version: $VERSION"
echo ""

# 1. 빌드 디렉토리 생성
echo -e "${YELLOW}1. 빌드 디렉토리 준비...${NC}"
rm -rf dist
mkdir -p dist

# 2. 필요한 파일만 복사
echo -e "${YELLOW}2. 필요한 파일 복사...${NC}"
cp manifest.json dist/
cp content.js popup.js background.js dist/ 2>/dev/null || echo "일부 JS 파일이 없을 수 있습니다"
cp *.css dist/ 2>/dev/null || echo "CSS 파일이 없을 수 있습니다"
cp *.html dist/ 2>/dev/null || echo "HTML 파일이 없을 수 있습니다"
if [ -d "icons" ]; then
    cp -r icons dist/
else
    echo "경고: icons 디렉토리가 없습니다"
fi

# 3. 개발용 코드 제거 (console.log 등)
echo -e "${YELLOW}3. 개발용 코드 제거...${NC}"

# 운영체제별 sed 명령어 처리
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    SED_INPLACE="sed -i ''"
else
    # Linux
    SED_INPLACE="sed -i"
fi

# JavaScript 파일들에서 console.log 제거
for file in dist/*.js; do
    if [ -f "$file" ]; then
        echo "  개발용 코드 제거: $(basename "$file")"
        $SED_INPLACE '/console\.log/d' "$file"
        $SED_INPLACE '/console\.warn/d' "$file"
        $SED_INPLACE '/console\.error/d' "$file"
        $SED_INPLACE '/console\.debug/d' "$file"
        # 주석 제거 (선택적)
        $SED_INPLACE '/^\/\//d' "$file"
        $SED_INPLACE '/^\/\*/,/\*\//d' "$file"
    fi
done

# 4. ZIP 파일 생성
echo -e "${YELLOW}4. ZIP 파일 생성...${NC}"
cd dist
zip -r ../${EXTENSION_NAME}-${VERSION}.zip . -x ".*" -x "__MACOSX"
cd ..

# 5. 파일 크기 확인
FILE_SIZE=$(du -h ${EXTENSION_NAME}-${VERSION}.zip | cut -f1)
echo -e "${GREEN}✓ ZIP 파일 생성 완료: ${EXTENSION_NAME}-${VERSION}.zip (${FILE_SIZE})${NC}"

# 6. 배포 전 유효성 검사
echo -e "${YELLOW}6. 배포 파일 유효성 검사...${NC}"

# manifest.json 검증
if [ -f "dist/manifest.json" ]; then
    echo "✓ manifest.json 존재"
    # JSON 유효성 검사 (선택적)
    if command -v python3 &> /dev/null; then
        python3 -c "import json; json.load(open('dist/manifest.json'))" && echo "✓ manifest.json 형식 유효" || echo "✗ manifest.json 형식 오류"
    fi
else
    echo "✗ manifest.json 누락"
fi

# 아이콘 파일 검증
if [ -d "dist/icons" ]; then
    echo "✓ 아이콘 디렉토리 존재"
    for size in 16 48 128; do
        if [ -f "dist/icons/icon${size}.png" ]; then
            echo "  ✓ icon${size}.png 존재"
        else
            echo "  ✗ icon${size}.png 누락"
        fi
    done
else
    echo "✗ 아이콘 디렉토리 누락"
fi

# 필수 파일 검증
for file in content.js popup.js background.js popup.html; do
    if [ -f "dist/$file" ]; then
        echo "✓ $file 존재"
    else
        echo "✗ $file 누락"
    fi
done

echo ""
echo -e "${YELLOW}배포 전 수동 체크리스트:${NC}"
echo "□ 브라우저에서 확장프로그램 테스트 완료"
echo "□ ChatGPT.com에서 모든 기능 정상 작동 확인"
echo "□ 개인정보처리방침 최신 상태 확인"
echo "□ 스크린샷 준비 완료 (5장 권장)"
echo "□ Chrome Web Store 개발자 계정 준비"
echo ""

# 7. Chrome Web Store 업로드 안내
echo -e "${YELLOW}Chrome Web Store 업로드 방법:${NC}"
echo "1. https://chrome.google.com/webstore/developer/dashboard 접속"
echo "2. '새 항목' 또는 기존 항목 선택"
echo "3. ${EXTENSION_NAME}-${VERSION}.zip 파일 업로드"
echo "4. 스토어 등록 정보 작성:"
echo "   - 설명: docs/CHROME_STORE_LISTING.md 내용 사용"
echo "   - 카테고리: 생산성"
echo "   - 언어: 한국어"
echo "   - 스크린샷 추가 (최소 1개)"
echo "5. '검토를 위해 제출' 클릭"
echo ""

# 8. 정리
echo -e "${YELLOW}임시 파일 정리...${NC}"
rm -rf dist

# ZIP 파일 생성 완료

# 9. 성공 메시지 및 다음 단계
echo -e "${GREEN}🎉 배포 준비 완료!${NC}"
echo -e "생성된 파일: ${GREEN}${EXTENSION_NAME}-${VERSION}.zip${NC}"
echo -e "파일 크기: ${GREEN}${FILE_SIZE}${NC}"
echo ""
echo -e "${YELLOW}다음 단계:${NC}"
echo "1. https://chrome.google.com/webstore/developer/dashboard 접속"
echo "2. '새 항목' 버튼 클릭 또는 기존 항목 업데이트"
echo "3. ${EXTENSION_NAME}-${VERSION}.zip 파일 업로드"
echo "4. docs/CHROME_STORE_LISTING.md의 정보를 복사하여 스토어 등록 정보 작성"
echo "5. 스크린샷 5장 업로드 (1280x800 권장)"
echo "6. '검토를 위해 제출' 클릭"
echo ""
echo -e "${YELLOW}참고 링크:${NC}"
echo "• Chrome Web Store 개발자 가이드: https://developer.chrome.com/docs/webstore/"
echo "• 확장프로그램 정책: https://developer.chrome.com/docs/webstore/program-policies/"
echo "• 리뷰 가이드라인: https://developer.chrome.com/docs/webstore/review-process/"
echo ""

# 선택적: 브라우저에서 테스트 안내
echo -e "${YELLOW}로컬 테스트 방법:${NC}"
echo "1. Chrome 브라우저에서 chrome://extensions/ 접속"
echo "2. '개발자 모드' 활성화"
echo "3. '압축해제된 확장 프로그램을 로드합니다' 클릭"
echo "4. dist/ 폴더 선택"
echo "5. ChatGPT.com에서 기능 테스트"