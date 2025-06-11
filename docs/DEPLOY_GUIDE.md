# Chrome Extension Store 배포 가이드

## 🚀 수동 배포

### 1. 배포 스크립트 실행
```bash
./deploy.sh
```

이 스크립트는 다음 작업을 수행합니다:
- 필요한 파일만 포함하여 dist 디렉토리 생성
- console.log 등 개발용 코드 제거
- 배포용 ZIP 파일 생성
- 배포 체크리스트 표시

### 2. Chrome Web Store에 업로드
1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard) 접속
2. "새 항목" 클릭 (첫 배포) 또는 기존 항목 선택 (업데이트)
3. 생성된 ZIP 파일 업로드
4. 스토어 등록 정보 입력
5. "검토를 위해 제출" 클릭

## 🤖 자동 배포 설정

### 1. Chrome Web Store API 설정

#### 1.1 Google Cloud Console에서 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성
3. Chrome Web Store API 활성화

#### 1.2 OAuth 2.0 자격 증명 생성
1. API 및 서비스 > 자격 증명
2. "자격 증명 만들기" > OAuth 클라이언트 ID
3. 애플리케이션 유형: 웹 애플리케이션
4. 승인된 리디렉션 URI: `https://developers.google.com/oauthplayground`
5. CLIENT_ID와 CLIENT_SECRET 저장

#### 1.3 Refresh Token 획득
1. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) 접속
2. 설정(톱니바퀴) > "Use your own OAuth credentials" 체크
3. CLIENT_ID와 CLIENT_SECRET 입력
4. Step 1: `https://www.googleapis.com/auth/chromewebstore` 스코프 입력
5. Authorize APIs 클릭
6. Step 2: Exchange authorization code for tokens
7. REFRESH_TOKEN 저장

### 2. 로컬 환경 설정

```bash
# ~/.bashrc 또는 ~/.zshrc에 추가
export CHROME_CLIENT_ID="your-client-id"
export CHROME_CLIENT_SECRET="your-client-secret"
export CHROME_REFRESH_TOKEN="your-refresh-token"
export CHROME_EXTENSION_ID="your-extension-id"
```

### 3. GitHub Actions 설정

Repository Settings > Secrets and variables > Actions에서 추가:
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `CHROME_EXTENSION_ID`

## 📋 배포 프로세스

### 버전 태그 배포
```bash
# 버전 업데이트
# manifest.json의 version 수정

# 변경사항 커밋
git add .
git commit -m "버전 1.0.1 릴리즈"

# 태그 생성 및 푸시
git tag v1.0.1
git push origin main --tags
```

GitHub Actions가 자동으로:
1. ZIP 파일 생성
2. Chrome Web Store에 업로드
3. GitHub Release 생성

## 🔍 배포 확인

### Chrome Web Store Developer Dashboard
- 업로드 상태 확인
- 검토 상태 확인 (보통 24-48시간)
- 게시 후 통계 확인

### 로컬 테스트
```bash
# 생성된 ZIP 파일로 테스트
1. chrome://extensions 접속
2. "압축해제된 확장 프로그램을 로드합니다" 클릭
3. dist 폴더 선택
```

## ⚠️ 주의사항

1. **버전 관리**
   - manifest.json의 version을 항상 증가시킬 것
   - 시맨틱 버저닝 사용 권장 (예: 1.0.0)

2. **권한 최소화**
   - 필요한 권한만 요청
   - 권한 변경 시 자세한 설명 필요

3. **스크린샷**
   - 1280x800 또는 640x400 크기
   - 실제 사용 화면 캡처
   - 최소 1개, 최대 5개

4. **설명**
   - README_EXTENSION.md 내용 활용
   - 주요 기능 명확히 설명
   - 개인정보 처리 방침 포함

## 🐛 트러블슈팅

### "Package is invalid" 오류
- manifest.json 문법 확인
- 필수 파일 누락 확인
- 아이콘 파일 경로 확인

### API 인증 실패
- Refresh Token 만료 확인
- 스코프 권한 확인
- CLIENT_ID/SECRET 확인

### 검토 거부
- 권한 사용 이유 명확히 설명
- 스크린샷에 실제 기능 표시
- 개인정보 처리 방침 추가