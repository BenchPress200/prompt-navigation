# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참조하는 가이드입니다.

## 프로젝트 개요

**Prompt Navigator**는 ChatGPT 사용 경험을 개선하는 Chrome 확장 프로그램입니다. ChatGPT 웹사이트에서 사용자 프롬프트 간 네비게이션, 프롬프트 저장 및 검색, 키보드 단축키를 제공합니다.

## 핵심 아키텍처

### Chrome Extension 구조
- **content.js**: ChatGPT 페이지에 주입되어 네비게이션 버튼 추가 및 DOM 조작
- **popup.js**: 확장프로그램 팝업 UI 관리 (프롬프트 히스토리, 검색 기능)
- **background.js**: Service Worker로 스토리지 관리 및 메시지 라우팅
- **manifest.json**: v3 manifest로 ChatGPT 도메인 권한 설정

### 주요 기능 모듈
1. **사이트 감지**: getCurrentSite()로 ChatGPT 도메인 인식
2. **선택자 시스템**: SITE_SELECTORS로 ChatGPT UI 요소 매핑
3. **네비게이션**: 사용자 메시지 간 스크롤 이동 (키보드 단축키 지원)
4. **프롬프트 수집**: DOM observer로 사용자 입력 자동 수집 및 저장
5. **검색 시스템**: 정규식 기반 프롬프트 검색

### 스토리지 구조
- `promptHistory`: 모든 프롬프트 데이터 배열
- `chatData`: 채팅별 그룹화된 프롬프트 매핑
- `settings`: 사용자 설정 (현재 질문 표시 등)

## 개발 명령어

### 아이콘 생성
```bash
node generate-icons.js
```
PNG 아이콘을 16x16, 48x48, 128x128 크기로 생성

### 배포 준비
```bash
./deploy.sh
```
프로덕션용 ZIP 파일 생성 (console.log 제거, 파일 최적화)

### 개발 테스트
Chrome://extensions에서 "개발자 모드" 활성화 후 폴더 로드

## 코딩 가이드라인

### CSS 클래스 명명
- 모든 확장프로그램 요소는 `chatgpt-navigator-` 접두사 사용
- 예: `chatgpt-navigator-button`, `chatgpt-navigator-modal`

### 키보드 단축키
- macOS: Cmd+Shift+방향키, Cmd+Shift+/, Cmd+Shift+;, Cmd+Shift+E
- Windows: Ctrl+Shift+방향키, Ctrl+Shift+/, Ctrl+Shift+;, Ctrl+Shift+E

### 브라우저 호환성
- Chrome Manifest V3 기준
- `chrome.storage.local` API 사용
- Service Worker 패턴 (background.js)

### 다국어 대응
- 한국어 우선이지만 영어 ChatGPT UI에서도 동작하도록 선택자 다중화
- 버튼 aria-label은 한국어/영어 모두 매칭

### 성능 고려사항
- DOM observer는 throttling 적용
- 대량 프롬프트 저장 시 청크 단위 처리
- 메모리 누수 방지를 위한 이벤트 리스너 정리

## 주의사항

### ChatGPT UI 의존성
- ChatGPT의 UI 변경에 민감함
- 선택자가 무효화될 수 있으므로 fallback 선택자 다수 준비
- `data-message-author-role` 속성에 크게 의존

### 권한 최소화
- `activeTab`과 `storage`만 사용
- ChatGPT 도메인에만 접근 제한

### 디버깅
- 개발 모드에서만 console.log 활성화
- 배포 시 자동으로 로그 제거

## 주요 파일별 역할

### content.js (가장 중요)
- ChatGPT 페이지 DOM 조작의 핵심
- 사용자 메시지 선택자 관리
- 네비게이션 버튼 동적 생성
- 키보드 이벤트 핸들링
- 프롬프트 실시간 수집

### popup.js
- 3개 탭 시스템 (전체 프롬프트, 현재 채팅, 설정)
- 정규식 검색 엔진
- Chrome storage와의 데이터 동기화

### background.js
- Content script와 popup 간 메시지 브로커
- 장기 스토리지 관리
- 팝업 창 프로그래밍 방식 제어

새로운 기능 추가 시에는 이 아키텍처를 따르고, ChatGPT UI 변경에 대비해 선택자를 여러 개 준비하세요.