// Prompt Navigator Content Script

// 현재 사이트 감지
function getCurrentSite() {
  const hostname = window.location.hostname;
  if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
    return 'chatgpt';
  }
  return 'unknown';
}

// 사이트별 선택자 설정 (ChatGPT만 지원)
const SITE_SELECTORS = {
  chatgpt: {
    userMessage: '[data-message-author-role="user"]',
    assistantMessage: '[data-message-author-role="assistant"]',
    toolButton: [
      '[data-testid*="tool"]',
      '[aria-label*="tool"]', 
      'button[aria-label*="Tools"]',
      'button[aria-label*="도구"]',
      'button[aria-label*="attach"]',
      'button[aria-label*="첨부"]',
      'button:has([data-testid*="tool"])',
      '[role="button"]:has(svg)',
      'form button[type="button"]'
    ],
    form: 'form',
    attachment: 'img, [data-testid="attachment"]'
  }
};

// 네비게이션 버튼 추가
function addNavigationButtons() {
  // 기존 버튼이 있으면 제거
  const existingNav = document.getElementById('chatgpt-navigator');
  if (existingNav) existingNav.remove();

  // ChatGPT 전용 - 도구 버튼 찾기
  const currentSite = getCurrentSite();
  if (currentSite !== 'chatgpt') return; // ChatGPT만 지원
  
  const selectors = SITE_SELECTORS.chatgpt;
  let targetElement = null;
  
  // 도구 버튼 찾기
  for (const selector of selectors.toolButton) {
    targetElement = document.querySelector(selector);
    if (targetElement) break;
  }

  // 도구 버튼을 찾지 못한 경우 폼 근처에 배치
  if (!targetElement) {
    const form = document.querySelector('form');
    if (!form) return;
    targetElement = form.querySelector('button[type="button"]') || form;
  }

  // 네비게이션 버튼 컨테이너 생성
  const navContainer = document.createElement('div');
  navContainer.id = 'prompt-navigator';
  navContainer.className = 'prompt-navigator';
  navContainer.setAttribute('data-site', currentSite);
  
  // 현재 테마 적용
  const currentTheme = getCurrentTheme();
  if (currentTheme) {
    navContainer.setAttribute('data-theme', currentTheme);
  }

  // 운영체제 감지
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'Cmd' : 'Ctrl';

  // 위로 버튼
  const upButton = document.createElement('button');
  upButton.className = 'nav-button';
  upButton.innerHTML = '⬆︎';
  upButton.title = `이전 사용자 메시지로 이동 (${modifierKey}+Shift+↑)`;
  if (currentTheme) {
    upButton.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'light') {
      upButton.style.setProperty('background', '#f9fafb', 'important');
      upButton.style.setProperty('color', '#374151', 'important');
      upButton.style.setProperty('border-color', '#d1d5db', 'important');
    } else if (currentTheme === 'dark') {
      upButton.style.setProperty('background', '#374151', 'important');
      upButton.style.setProperty('color', '#f9fafb', 'important');
      upButton.style.setProperty('border-color', '#4b5563', 'important');
    }
  }
  upButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToPreviousUserMessage();
  }, { capture: true });

  // 아래로 버튼
  const downButton = document.createElement('button');
  downButton.className = 'nav-button';
  downButton.innerHTML = '⬇︎';
  downButton.title = `다음 사용자 메시지로 이동 (${modifierKey}+Shift+↓)`;
  if (currentTheme) {
    downButton.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'light') {
      downButton.style.setProperty('background', '#f9fafb', 'important');
      downButton.style.setProperty('color', '#374151', 'important');
      downButton.style.setProperty('border-color', '#d1d5db', 'important');
    } else if (currentTheme === 'dark') {
      downButton.style.setProperty('background', '#374151', 'important');
      downButton.style.setProperty('color', '#f9fafb', 'important');
      downButton.style.setProperty('border-color', '#4b5563', 'important');
    }
  }
  downButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToNextUserMessage();
  }, { capture: true });

  // 프롬프트 목록 버튼
  const listButton = document.createElement('button');
  listButton.className = 'nav-button';
  listButton.innerHTML = '📖';
  listButton.title = `프롬프트 목록 보기 (${modifierKey}+Shift+/)`;
  if (currentTheme) {
    listButton.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'light') {
      listButton.style.setProperty('background', '#f9fafb', 'important');
      listButton.style.setProperty('color', '#374151', 'important');
      listButton.style.setProperty('border-color', '#d1d5db', 'important');
    } else if (currentTheme === 'dark') {
      listButton.style.setProperty('background', '#374151', 'important');
      listButton.style.setProperty('color', '#f9fafb', 'important');
      listButton.style.setProperty('border-color', '#4b5563', 'important');
    }
  }
  listButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPromptListModal();
  }, { capture: true });

  navContainer.appendChild(upButton);
  navContainer.appendChild(downButton);
  navContainer.appendChild(listButton);

  // ChatGPT 도구 버튼 근처에 배치
  if (targetElement && targetElement.parentElement) {
    const parentContainer = targetElement.parentElement;
    parentContainer.appendChild(navContainer);
  } else {
    // 폴백: 폼 근처에 배치
    const form = document.querySelector('form');
    if (form && form.parentElement) {
      form.parentElement.insertBefore(navContainer, form);
    }
  }
}

// 사용자 메시지 찾기
function getUserMessages() {
  const currentSite = getCurrentSite();
  const selectors = SITE_SELECTORS[currentSite];
  
  if (!selectors) return [];
  
  const messages = document.querySelectorAll(selectors.userMessage);
  return Array.from(messages);
}

// 현재 보이는 사용자 메시지 찾기
function getCurrentVisibleUserMessage() {
  const messages = getUserMessages();
  const viewportTop = window.scrollY;
  const viewportMiddle = viewportTop + window.innerHeight / 2;

  let closest = null;
  let closestDistance = Infinity;

  messages.forEach(message => {
    const rect = message.getBoundingClientRect();
    const messageTop = rect.top + window.scrollY;
    const distance = Math.abs(messageTop - viewportMiddle);

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = message;
    }
  });

  return closest;
}

// 이전 사용자 메시지로 이동
function navigateToPreviousUserMessage() {
  const messages = getUserMessages();
  const current = getCurrentVisibleUserMessage();
  
  if (!current || messages.length === 0) return;

  const currentIndex = messages.indexOf(current);
  if (currentIndex > 0) {
    const previous = messages[currentIndex - 1];
    previous.scrollIntoView({ behavior: getScrollBehavior(), block: 'center' });
  }
}

// 다음 사용자 메시지로 이동
function navigateToNextUserMessage() {
  const messages = getUserMessages();
  const current = getCurrentVisibleUserMessage();
  
  if (!current || messages.length === 0) return;

  const currentIndex = messages.indexOf(current);
  if (currentIndex < messages.length - 1) {
    const next = messages[currentIndex + 1];
    next.scrollIntoView({ behavior: getScrollBehavior(), block: 'center' });
  }
}


// 프롬프트 목록 모달 표시
function showPromptListModal() {
  // 기존 모달 제거
  const existingModal = document.getElementById('prompt-list-modal');
  if (existingModal) existingModal.remove();

  // 모달 생성
  const modal = document.createElement('div');
  modal.id = 'prompt-list-modal';
  modal.className = 'prompt-list-modal';
  
  // 현재 테마 적용
  const currentTheme = getCurrentTheme();
  if (currentTheme) {
    modal.setAttribute('data-theme', currentTheme);
  }

  // 모달 컨텐츠
  const modalContent = document.createElement('div');
  modalContent.className = 'prompt-list-modal-content';

  // 헤더
  const header = document.createElement('div');
  header.className = 'prompt-list-header';
  header.innerHTML = '<h3>프롬프트 목록</h3>';

  // 검색창
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = '정규식으로 검색...';
  searchInput.className = 'prompt-search-input';
  searchInput.addEventListener('input', filterPrompts);

  // 프롬프트 리스트
  const promptList = document.createElement('div');
  promptList.className = 'prompt-list';
  promptList.id = 'prompt-list-items';

  modalContent.appendChild(header);
  modalContent.appendChild(searchInput);
  modalContent.appendChild(promptList);
  modal.appendChild(modalContent);

  // 모달 외부 클릭시 닫기
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // ESC 키로 닫기
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(modal);

  // 프롬프트 목록 로드
  loadCurrentChatPrompts();

  // 검색창에 포커스 (약간의 지연을 두어 모달이 완전히 렌더링된 후 포커싱)
  setTimeout(() => {
    searchInput.focus();
  }, 100);
}

// 현재 채팅의 프롬프트 목록 로드
function loadCurrentChatPrompts() {
  const promptList = document.getElementById('prompt-list-items');
  const userMessages = getUserMessages();

  if (userMessages.length === 0) {
    promptList.innerHTML = '<p class="no-prompts">프롬프트가 없습니다.</p>';
    return;
  }

  promptList.innerHTML = userMessages.map((msg, index) => {
    const text = msg.textContent.trim();
    const attachments = msg.querySelectorAll('img, [data-testid="attachment"]');
    const hasAttachments = attachments.length > 0;
    
    // 텍스트가 너무 길면 적절히 자르기 (200자 제한)
    const displayText = text.length > 200 ? text.substring(0, 200) + '...' : text;

    return `
      <div class="prompt-item" data-index="${index}">
        <div class="prompt-content">
          <div class="prompt-text">${escapeHtml(displayText)}</div>
          ${hasAttachments ? '<span class="attachment-indicator">📎</span>' : ''}
        </div>
        <div class="prompt-actions">
          <button class="prompt-action-btn" data-action="scroll" data-index="${index}">이동</button>
        </div>
      </div>
    `;
  }).join('');

  // 이동 버튼 이벤트 리스너 추가 - 이벤트 위임 방식으로 변경
  promptList.addEventListener('click', (e) => {
    if (e.target && e.target.matches('[data-action="scroll"]')) {
      e.preventDefault();
      e.stopPropagation();
      debugLog('프롬프트 목록 이동 버튼 클릭됨 (이벤트 위임)');
      const index = parseInt(e.target.dataset.index);
      debugLog('이동할 인덱스:', index);
      if (!isNaN(index)) {
        scrollToPrompt(index);
      } else {
        console.error('유효하지 않은 인덱스:', e.target.dataset.index);
      }
    }
  });
}

// 프롬프트로 스크롤
function scrollToPrompt(index) {
  const messages = getUserMessages();
  if (messages[index]) {
    messages[index].scrollIntoView({ behavior: getScrollBehavior(), block: 'center' });
    
    // 확인된 프롬프트 저장 기능 제거됨
    
    // 모달 닫기
    const modal = document.getElementById('prompt-list-modal');
    if (modal) modal.remove();
  }
}

// Production 모드 설정 (GitHub Actions에서 true로 변경됨)
const PRODUCTION_MODE = false;

// 설정에 따라 현재 질문 표시 제어
let showCurrentQuestionSetting = true;
let hideOnSmallScreenSetting = true; // 기본값: 작은 화면에서 숨기기
let autoShowOnEntrySetting = true; // 기본값: 채팅창 진입 시 자동 표시
let questionLinesSetting = 4; // 기본값: 4줄
let themeSetting = 'system'; // 기본값: 시스템 설정 따르기
let scrollSpeedSetting = 3; // 기본값: 3 (보통)
let disableScrollAnimationSetting = false; // 기본값: false (애니메이션 활성화)

// 디버그 로그 함수
function debugLog(...args) {
  if (!PRODUCTION_MODE) {
    console.log('[Prompt Navigator]', ...args);
  }
}

// 설정 로드
chrome.storage.local.get(['showCurrentQuestion', 'hideOnSmallScreen', 'autoShowOnEntry', 'questionLines', 'theme', 'scrollSpeed', 'disableScrollAnimation'], (result) => {
  debugLog('Prompt Navigator 스크립트 로드됨 - 버전:', new Date().toISOString());
  debugLog('현재 질문 표시 설정 로드:', result);
  showCurrentQuestionSetting = result.showCurrentQuestion !== false;
  hideOnSmallScreenSetting = result.hideOnSmallScreen !== false; // 기본값: true
  autoShowOnEntrySetting = result.autoShowOnEntry !== false; // 기본값: true
  questionLinesSetting = result.questionLines || 4; // 기본값: 4줄
  themeSetting = result.theme || 'system'; // 기본값: 시스템 설정 따르기
  scrollSpeedSetting = result.scrollSpeed || 3; // 기본값: 3 (보통)
  disableScrollAnimationSetting = result.disableScrollAnimation === true; // 기본값: false
  debugLog('showCurrentQuestionSetting =', showCurrentQuestionSetting);
  debugLog('hideOnSmallScreenSetting =', hideOnSmallScreenSetting);
  debugLog('autoShowOnEntrySetting =', autoShowOnEntrySetting);
  debugLog('questionLinesSetting =', questionLinesSetting);
  debugLog('themeSetting =', themeSetting);
  debugLog('scrollSpeedSetting =', scrollSpeedSetting);
  debugLog('disableScrollAnimationSetting =', disableScrollAnimationSetting);
  updateQuestionDisplayVisibility();
  updateQuestionTextHeight();
  
  // 설정 로드 완료 후 테마 적용
  debugLog('설정 로드 완료 후 테마 적용 시작');
  detectAndApplyTheme();
});

function updateQuestionDisplayVisibility() {
  const display = document.getElementById('current-question-display');
  if (display) {
    // 작은 화면에서 숨기기 클래스 적용/제거
    if (hideOnSmallScreenSetting) {
      display.classList.add('hide-on-small');
    } else {
      display.classList.remove('hide-on-small');
    }
    
    if (!showCurrentQuestionSetting) {
      debugLog('updateQuestionDisplayVisibility: 현재 질문 표시 설정이 꺼져서 질문창 숨김');
      display.style.display = 'none';
    } else if (!autoShowOnEntrySetting) {
      debugLog('updateQuestionDisplayVisibility: 자동 표시 설정이 꺼져서 접힌 상태로 표시');
      display.classList.add('collapsed');
      display.style.display = 'block';
      display.dataset.userCollapsedState = 'true'; // 초기 접힌 상태를 사용자 설정으로 저장
      const collapseButton = display.querySelector('.question-collapse-btn');
      if (collapseButton) {
        collapseButton.innerHTML = '질문보기';
        collapseButton.title = '질문 내용 보기';
      }
    } else {
      // 두 설정이 모두 켜진 경우 기존 로직에 따라 표시
      debugLog('updateQuestionDisplayVisibility: 설정이 켜져서 질문창 업데이트');
      display.classList.remove('collapsed');
      const collapseButton = display.querySelector('.question-collapse-btn');
      if (collapseButton) {
        collapseButton.innerHTML = '접기';
        collapseButton.title = '컴포넌트 접기/펼치기';
      }
      updateCurrentQuestion();
    }
  }
}

// 질문 텍스트 높이 업데이트
function updateQuestionTextHeight() {
  const questionText = document.querySelector('.question-text');
  if (questionText) {
    // 줄 높이 1.5em * 줄 수로 max-height 계산
    const maxHeight = `calc(1.5em * ${questionLinesSetting})`;
    questionText.style.maxHeight = maxHeight;
    debugLog('질문 텍스트 높이 업데이트:', maxHeight);
  }
}

// 스크롤 속도를 실제 behavior 옵션으로 변환
function getScrollBehavior() {
  // 애니메이션 비활성화가 켜져있으면 항상 'auto' 반환
  if (disableScrollAnimationSetting) {
    return 'auto';
  }
  
  // 기본적으로 smooth 사용
  return 'smooth';
}

// 속도별 스크롤 지속시간 (밀리초)
function getScrollDuration() {
  const speedDurations = {
    1: 200,  // 매우 빠름
    2: 400,  // 빠름 
    3: 600,  // 보통
    4: 800,  // 느림
    5: 1200  // 매우 느림
  };
  return speedDurations[scrollSpeedSetting] || 600;
}

// 사용자 정의 스크롤 함수 (부드러운 애니메이션)
function smoothScrollToElement(element, options = {}) {
  if (disableScrollAnimationSetting) {
    element.scrollIntoView({ behavior: 'auto', block: options.block || 'center' });
    return;
  }

  const duration = getScrollDuration();
  const start = window.pageYOffset;
  const rect = element.getBoundingClientRect();
  const elementTop = rect.top + start;
  
  // block 옵션에 따라 목표 위치 계산
  let targetY;
  switch (options.block) {
    case 'start':
      targetY = elementTop;
      break;
    case 'end':
      targetY = elementTop - window.innerHeight + rect.height;
      break;
    case 'center':
    default:
      targetY = elementTop - (window.innerHeight / 2) + (rect.height / 2);
      break;
  }
  
  const startTime = performance.now();
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // easeInOut 함수 (부드러운 애니메이션)
    const eased = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    const currentY = start + (targetY - start) * eased;
    window.scrollTo(0, currentY);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  requestAnimationFrame(animate);
}

// 창 크기 변경 감지
function handleWindowResize() {
  updateQuestionDisplayVisibility();
}

// 리사이즈 이벤트 리스너 추가
window.addEventListener('resize', handleWindowResize);

// 프롬프트 필터링
function filterPrompts() {
  const searchInput = document.querySelector('.prompt-search-input');
  const pattern = searchInput.value;
  const items = document.querySelectorAll('.prompt-item');

  items.forEach(item => {
    const text = item.querySelector('.prompt-text').textContent;
    try {
      const regex = new RegExp(pattern, 'i');
      item.style.display = regex.test(text) ? '' : 'none';
    } catch (e) {
      // 잘못된 정규식인 경우 모두 표시
      item.style.display = '';
    }
  });
}

// HTML 이스케이프 함수
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 프롬프트 히스토리 저장
async function savePromptHistory(userMessage) {
  const messageText = userMessage.textContent;
  const messageHTML = userMessage.innerHTML;
  const timestamp = new Date().toISOString();
  const url = window.location.href;

  // 이미지나 첨부파일 확인
  const attachments = userMessage.querySelectorAll('img, [data-testid="attachment"]');
  const attachmentData = Array.from(attachments).map(att => ({
    type: att.tagName,
    src: att.src || att.dataset.src || ''
  }));

  // 도구 사용 감지
  const tool = detectUsedTool(userMessage);

  const promptData = {
    text: messageText,
    html: messageHTML,
    timestamp: timestamp,
    url: url,
    site: getCurrentSite(), // 사이트 정보 추가
    chatTitle: getChatTitleFromDOM(), // 채팅 제목 추가
    attachments: attachmentData,
    tool: tool,
    status: 'pending' // 답변 대기 상태
  };

  // Chrome storage에 저장 - Extension context 확인
  if (chrome.runtime && chrome.runtime.id) {
    chrome.storage.local.get(['promptHistory'], (result) => {
      if (chrome.runtime.lastError) {
        debugLog('프롬프트 히스토리 로드 에러:', chrome.runtime.lastError);
        return;
      }
      
      const history = result.promptHistory || [];
      history.push(promptData);
      
      // 최대 100개까지만 저장
      if (history.length > 100) {
        history.shift();
      }

      chrome.storage.local.set({ promptHistory: history }, () => {
        if (chrome.runtime.lastError) {
          debugLog('프롬프트 히스토리 저장 에러:', chrome.runtime.lastError);
        }
      });
    });
  }

  // 답변 상태 모니터링 시작
  monitorAnswerStatus(promptData);
}

// 사용된 도구 감지
function detectUsedTool(userMessage) {
  // 도구 선택 버튼이나 UI 요소 확인
  const form = userMessage.closest('form') || document.querySelector('form');
  
  // 도구 관련 UI 요소들 확인
  const toolElements = [
    '[data-testid*="tool"]',
    '[aria-label*="tool"]',
    '.tool-selected',
    '.plugin-active',
    '[data-testid*="dalle"]',
    '[data-testid*="browser"]',
    '[data-testid*="python"]'
  ];

  for (const selector of toolElements) {
    const element = form?.querySelector(selector) || document.querySelector(selector);
    if (element) {
      const text = element.textContent.toLowerCase();
      const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
      
      if (text.includes('dall') || text.includes('이미지') || ariaLabel.includes('dall')) {
        return 'dalle';
      }
      if (text.includes('browser') || text.includes('웹') || text.includes('검색') || ariaLabel.includes('browser')) {
        return 'browser';
      }
      if (text.includes('python') || text.includes('코드') || ariaLabel.includes('python')) {
        return 'python';
      }
      if (text.includes('research') || text.includes('심층') || ariaLabel.includes('research')) {
        return 'deep_research';
      }
    }
  }

  return null;
}

// 답변 상태 모니터링
function monitorAnswerStatus(promptData) {
  const maxWaitTime = 60000; // 60초 대기
  const startTime = Date.now();
  
  const checkAnswer = () => {
    const currentTime = Date.now();
    
    // 시간 초과 체크
    if (currentTime - startTime > maxWaitTime) {
      updatePromptStatus(promptData, 'timeout');
      return;
    }

    // 답변 확인
    const currentSite = getCurrentSite();
    const selectors = SITE_SELECTORS[currentSite];
    if (!selectors) return;
    
    const messages = Array.from(document.querySelectorAll(selectors.assistantMessage));
    const latestResponse = messages[messages.length - 1];
    
    if (latestResponse) {
      const responseText = latestResponse.textContent.trim();
      if (responseText && responseText.length > 10) {
        updatePromptStatus(promptData, 'success', responseText.substring(0, 100));
        return;
      }
    }

    // 에러 확인
    const errorElements = document.querySelectorAll('.error, [data-testid*="error"], .message-error');
    if (errorElements.length > 0) {
      updatePromptStatus(promptData, 'error');
      return;
    }

    // 계속 모니터링
    setTimeout(checkAnswer, 2000);
  };

  setTimeout(checkAnswer, 1000); // 1초 후 시작
}

// 프롬프트 상태 업데이트
function updatePromptStatus(promptData, status, responsePreview = '') {
  chrome.storage.local.get(['promptHistory'], (result) => {
    const history = result.promptHistory || [];
    const index = history.findIndex(item => 
      item.timestamp === promptData.timestamp && item.text === promptData.text
    );
    
    if (index !== -1) {
      history[index].status = status;
      if (responsePreview) {
        history[index].responsePreview = responsePreview;
      }
      chrome.storage.local.set({ promptHistory: history });
    }
  });
}

// 현재 표시된 질문 요소를 저장할 전역 변수
let currentQuestionElement = null;

// 질문 표시 컴포넌트 생성
function createQuestionDisplay() {
  debugLog('createQuestionDisplay 호출됨');
  // 기존 컴포넌트 제거
  const existing = document.getElementById('current-question-display');
  if (existing) {
    debugLog('기존 질문 표시 컴포넌트 제거');
    existing.remove();
  }
  
  // 페이지 새로고침 시 사용자 상태 초기화
  // (새로운 컴포넌트 생성 시마다 초기화)

  // 질문 표시 컨테이너 생성
  const display = document.createElement('div');
  display.id = 'current-question-display';
  display.className = 'current-question-display';
  
  // 현재 테마 적용
  const currentTheme = getCurrentTheme();
  if (currentTheme) {
    display.setAttribute('data-theme', currentTheme);
    debugLog('질문 표시 컴포넌트에 테마 적용:', currentTheme);
    
    // 강제로 테마 스타일 적용 (important 플래그 사용)
    if (currentTheme === 'light') {
      display.style.setProperty('background', 'rgba(255, 255, 255, 0.95)', 'important');
      display.style.setProperty('border-color', '#e5e5e5', 'important');
      display.style.setProperty('color', '#333', 'important');
      display.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)', 'important');
      debugLog('질문 표시 컴포넌트에 라이트 모드 직접 스타일 적용 (important)');
    } else if (currentTheme === 'dark') {
      display.style.setProperty('background', 'rgba(42, 42, 42, 0.95)', 'important');
      display.style.setProperty('border-color', '#444', 'important');
      display.style.setProperty('color', '#e5e5e5', 'important');
      display.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)', 'important');
      debugLog('질문 표시 컴포넌트에 다크 모드 직접 스타일 적용 (important)');
    }
  }

  // 복사 버튼
  const copyButton = document.createElement('button');
  copyButton.className = 'question-btn question-copy-btn';
  copyButton.innerHTML = '📋 복사';
  copyButton.title = '현재 질문을 클립보드에 복사';
  if (currentTheme) {
    copyButton.setAttribute('data-theme', currentTheme);
    // 버튼 테마 스타일 적용
    if (currentTheme === 'light') {
      copyButton.style.setProperty('background', '#3b82f6', 'important');
      copyButton.style.setProperty('color', 'white', 'important');
    } else if (currentTheme === 'dark') {
      copyButton.style.setProperty('background', '#1e40af', 'important');
      copyButton.style.setProperty('color', 'white', 'important');
    }
  }
  copyButton.onclick = (e) => {
    e.stopPropagation();
    const questionText = display.querySelector('.question-text');
    if (questionText) {
      navigator.clipboard.writeText(questionText.textContent).then(() => {
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '✅ 복사됨';
        setTimeout(() => {
          copyButton.innerHTML = originalText;
        }, 1500);
      }).catch(() => {
        // 복사 실패 시 대체 방법
        const textArea = document.createElement('textarea');
        textArea.value = questionText.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '✅ 복사됨';
        setTimeout(() => {
          copyButton.innerHTML = originalText;
        }, 1500);
      });
    }
  };

  // 접기 버튼
  const collapseButton = document.createElement('button');
  collapseButton.className = 'question-btn question-collapse-btn';
  collapseButton.innerHTML = '접기';
  collapseButton.title = '컴포넌트 접기/펼치기';
  if (currentTheme) {
    collapseButton.setAttribute('data-theme', currentTheme);
    // 버튼 테마 스타일 적용
    if (currentTheme === 'light') {
      collapseButton.style.setProperty('background', '#e5e7eb', 'important');
      collapseButton.style.setProperty('color', '#374151', 'important');
    } else if (currentTheme === 'dark') {
      collapseButton.style.setProperty('background', '#4b5563', 'important');
      collapseButton.style.setProperty('color', '#f9fafb', 'important');
    }
  }
  collapseButton.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // 수동으로 접기/펼치기 상태 변경
    const isCurrentlyCollapsed = display.classList.contains('collapsed');
    
    if (isCurrentlyCollapsed) {
      // 펼치기
      display.classList.remove('collapsed');
      collapseButton.innerHTML = '접기';
      collapseButton.title = '컴포넌트 접기/펼치기';
      debugLog('질문창 수동으로 펼침');
    } else {
      // 접기
      display.classList.add('collapsed');
      collapseButton.innerHTML = '질문보기';
      collapseButton.title = '질문 내용 보기';
      debugLog('질문창 수동으로 접음');
    }
    
    // 수동 조작 플래그 설정 (더 긴 시간 동안 유지)
    display.dataset.manualToggle = 'true';
    display.dataset.userCollapsedState = isCurrentlyCollapsed ? 'false' : 'true'; // 사용자가 설정한 상태 저장
    
    // 더 긴 시간 후에 플래그 제거 (5초)
    setTimeout(() => {
      delete display.dataset.manualToggle;
    }, 5000);
  };

  // 질문 내용
  const content = document.createElement('div');
  content.className = 'question-content';
  content.innerHTML = '<span class="question-label">🙋현재 질문</span><span class="question-text">스크롤하여 답변을 확인하세요</span>';

  // 버튼 그룹 컨테이너
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'question-button-group';

  // 이동 버튼
  const navigateButton = document.createElement('button');
  navigateButton.className = 'question-btn question-navigate-btn';
  navigateButton.innerHTML = '↗️ 이 질문으로 이동';
  navigateButton.title = '질문을 화면 상단 30% 위치에 표시';
  if (currentTheme) {
    navigateButton.setAttribute('data-theme', currentTheme);
    // 버튼 테마 스타일 적용
    if (currentTheme === 'light') {
      navigateButton.style.setProperty('background', '#10a37f', 'important');
      navigateButton.style.setProperty('color', 'white', 'important');
    } else if (currentTheme === 'dark') {
      navigateButton.style.setProperty('background', '#059669', 'important');
      navigateButton.style.setProperty('color', 'white', 'important');
    }
  }
  navigateButton.addEventListener('click', (e) => {
    e.stopPropagation();
    debugLog('이동 버튼 클릭됨, currentQuestionElement:', currentQuestionElement);
    navigateToCurrentQuestion();
  });

  // 다시 표시 안함 버튼
  const hideButton = document.createElement('button');
  hideButton.className = 'question-btn question-hide-btn';
  hideButton.innerHTML = '다시 표시 하지 않기';
  hideButton.title = '현재 질문 표시 기능을 비활성화합니다';
  if (currentTheme) {
    hideButton.setAttribute('data-theme', currentTheme);
    // 버튼 테마 스타일 적용
    if (currentTheme === 'light') {
      hideButton.style.setProperty('background', '#6b7280', 'important');
      hideButton.style.setProperty('color', 'white', 'important');
    } else if (currentTheme === 'dark') {
      hideButton.style.setProperty('background', '#374151', 'important');
      hideButton.style.setProperty('color', '#f9fafb', 'important');
    }
  }
  hideButton.onclick = () => {
    // 확인창 표시
    const confirmed = confirm('확인을 누르면 질문이 더이상 표시 되지 않습니다.\n\nTip: 질문을 다시 보고 싶으시다면 크롬 확장프로그램 \'Prompt Navigator\'의 설정페이지에서 다시 켜주세요.');
    
    if (confirmed) {
      // 두 설정 모두 false로 변경하고 모달 숨김
      chrome.storage.local.set({ 
        showCurrentQuestion: false,
        autoShowOnEntry: false
      });
      showCurrentQuestionSetting = false;
      autoShowOnEntrySetting = false;
      display.style.display = 'none';
      debugLog('다시 표시 하지 않기: 두 설정 모두 false로 변경됨');
    }
  };

  // 버튼 그룹에 버튼들 추가
  buttonGroup.appendChild(copyButton);
  buttonGroup.appendChild(collapseButton);
  buttonGroup.appendChild(navigateButton);
  buttonGroup.appendChild(hideButton);
  
  // 메인 디스플레이에 요소들 추가
  display.appendChild(content);
  display.appendChild(buttonGroup);
  
  // 자동 표시 설정에 따라 초기 표시 상태 결정
  if (!autoShowOnEntrySetting) {
    // 자동 표시가 꺼져있으면 접힌 상태로 표시
    display.classList.add('collapsed');
    display.style.display = 'block';
    display.dataset.userCollapsedState = 'true'; // 초기 접힌 상태를 사용자 설정으로 저장
    collapseButton.innerHTML = '질문보기';
    collapseButton.title = '질문 내용 보기';
    debugLog('자동 표시 설정이 꺼져있어서 질문 표시 컴포넌트를 접힌 상태로 표시');
  } else {
    display.style.display = 'none'; // 기본적으로 숨겨둠 (스크롤 이벤트에서 표시될 예정)
  }
  
  document.body.appendChild(display);
  debugLog('질문 표시 컴포넌트가 body에 추가됨');
  
  // 질문 텍스트 높이 초기 설정
  updateQuestionTextHeight();
}

// 스크롤 이벤트 리스너 설정
function setupScrollListener() {
  debugLog('setupScrollListener 호출됨');
  let scrollTimeout;
  let isScrolling = false;
  
  // 채팅 컨테이너 찾기
  const chatContainer = document.querySelector('main [class*="react-scroll-to-bottom"]') || 
                       document.querySelector('main');
  
  debugLog('채팅 컨테이너:', chatContainer);
  
  if (chatContainer) {
    chatContainer.addEventListener('scroll', () => {
      isScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        updateCurrentQuestion();
        isScrolling = false;
      }, 300); // 스크롤 중 너무 자주 호출되지 않도록 300ms로 증가
    });
  }

  // 윈도우 스크롤도 감지
  window.addEventListener('scroll', () => {
    isScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      updateCurrentQuestion();
      isScrolling = false;
    }, 300);
  });

  // 초기 업데이트
  debugLog('1초 후 updateCurrentQuestion 호출 예정');
  setTimeout(updateCurrentQuestion, 1000);
}

// 현재 보고 있는 답변의 질문 업데이트
function updateCurrentQuestion() {
  const display = document.getElementById('current-question-display');
  
  if (!display) {
    debugLog('현재 질문 표시: display 요소 없음');
    return;
  }
  
  // 설정이 꺼져있으면 표시하지 않음
  if (!showCurrentQuestionSetting) {
    debugLog('현재 질문 표시: 설정이 꺼져있음');
    hideQuestionDisplay();
    return;
  }

  // 사용자 메시지가 1개 이하면 질문창 숨기기
  const userMessages = getUserMessages();
  if (userMessages.length <= 1) {
    debugLog('현재 질문 표시: 사용자 메시지가 1개 이하이므로 질문창 숨김');
    hideQuestionDisplay();
    return;
  }

  // 자동 표시 설정이 꺼져있으면 접힌 상태로 유지하고 질문 업데이트만 진행
  if (!autoShowOnEntrySetting) {
    debugLog('현재 질문 표시: 자동 표시 설정이 꺼져있어서 접힌 상태로 유지하면서 질문 업데이트');
    
    // 수동 조작 중이면 상태 변경하지 않음
    if (display.dataset.manualToggle === 'true') {
      debugLog('수동 조작 중이므로 상태 변경 건너뜀');
      // 질문 내용만 업데이트
      continueUpdateCurrentQuestion();
      return;
    }
    
    // 사용자가 이미 펼친 상태라면 그 상태를 유지
    if (display.dataset.userCollapsedState === 'false') {
      debugLog('사용자가 펼친 상태이므로 펼쳐진 상태 유지');
      display.classList.remove('collapsed');
      display.style.display = 'block';
      const collapseButton = display.querySelector('.question-collapse-btn');
      if (collapseButton) {
        collapseButton.innerHTML = '접기';
        collapseButton.title = '컴포넌트 접기/펼치기';
      }
      // 질문 내용만 업데이트
      continueUpdateCurrentQuestion();
      return;
    }
    
    // 접힌 상태로 표시하되 질문 내용은 업데이트
    display.classList.add('collapsed');
    display.style.display = 'block';
    const collapseButton = display.querySelector('.question-collapse-btn');
    if (collapseButton) {
      collapseButton.innerHTML = '질문보기';
      collapseButton.title = '질문 내용 보기';
    }
    // 질문 내용만 업데이트
    continueUpdateCurrentQuestion();
    return;
  }

  // 바로 질문 업데이트 진행
  continueUpdateCurrentQuestion();
}

// 현재 질문 업데이트 로직 분리
function continueUpdateCurrentQuestion() {
  const currentAnswer = getCurrentVisibleAnswer();

  debugLog('현재 질문 표시: currentAnswer =', currentAnswer);

  if (currentAnswer) {
    const question = findQuestionForAnswer(currentAnswer);
    debugLog('현재 질문 표시: question =', question);
    if (question) {
      currentQuestionElement = question; // 현재 질문 요소 저장
      showQuestion(question.textContent.trim());
    } else {
      currentQuestionElement = null;
      hideQuestionDisplay();
    }
  } else {
    currentQuestionElement = null;
    hideQuestionDisplay();
  }
}

// 현재 화면에 보이는 답변 찾기
function getCurrentVisibleAnswer() {
  const currentSite = getCurrentSite();
  const selectors = SITE_SELECTORS[currentSite];
  if (!selectors) {
    debugLog('getCurrentVisibleAnswer: selectors 없음, currentSite =', currentSite);
    return null;
  }
  
  const answers = Array.from(document.querySelectorAll(selectors.assistantMessage));
  debugLog('getCurrentVisibleAnswer: 찾은 답변 개수 =', answers.length);
  if (answers.length === 0) return null;

  const viewportTop = window.scrollY;
  const viewportMiddle = viewportTop + window.innerHeight / 2;

  let closestAnswer = null;
  let closestDistance = Infinity;

  answers.forEach(answer => {
    const rect = answer.getBoundingClientRect();
    const answerTop = rect.top + window.scrollY;
    const answerBottom = answerTop + rect.height;
    
    // 답변이 화면에 보이는지 확인
    if (answerBottom > viewportTop && answerTop < viewportTop + window.innerHeight) {
      const distance = Math.abs(answerTop - viewportMiddle);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestAnswer = answer;
      }
    }
  });

  return closestAnswer;
}

// 답변에 해당하는 질문 찾기
function findQuestionForAnswer(answerElement) {
  debugLog('findQuestionForAnswer 호출됨');
  const currentSite = getCurrentSite();
  const selectors = SITE_SELECTORS[currentSite];
  if (!selectors) return null;
  
  // 답변 바로 앞에 있는 사용자 메시지 찾기
  let currentElement = answerElement.previousElementSibling;
  
  while (currentElement) {
    // 현재 요소가 사용자 메시지인지 확인
    if (currentElement.matches && currentElement.matches(selectors.userMessage)) {
      debugLog('바로 앞 사용자 메시지 찾음');
      return currentElement;
    }
    // 현재 요소 내부에 사용자 메시지가 있는지 확인
    const userMessage = currentElement.querySelector(selectors.userMessage);
    if (userMessage) {
      debugLog('내부에서 사용자 메시지 찾음');
      return userMessage;
    }
    currentElement = currentElement.previousElementSibling;
  }
  
  // 대안: 모든 사용자 메시지와 답변을 순서대로 매칭
  const answers = Array.from(document.querySelectorAll(selectors.assistantMessage));
  const questions = Array.from(document.querySelectorAll(selectors.userMessage));
  
  debugLog('전체 답변 수:', answers.length, '전체 질문 수:', questions.length);
  
  const answerIndex = answers.indexOf(answerElement);
  debugLog('현재 답변 인덱스:', answerIndex);
  
  if (answerIndex >= 0 && answerIndex < questions.length) {
    debugLog('인덱스로 질문 찾음');
    return questions[answerIndex];
  }
  
  return null;
}

// 질문 표시
function showQuestion(questionText) {
  debugLog('showQuestion 호출됨, 질문:', questionText);
  
  const display = document.getElementById('current-question-display');
  debugLog('display 요소:', display);
  
  if (!display) {
    debugLog('display 요소가 없어서 다시 생성');
    createQuestionDisplay();
    // 다시 찾기
    const newDisplay = document.getElementById('current-question-display');
    if (newDisplay) {
      const questionTextElement = newDisplay.querySelector('.question-text');
      if (questionTextElement) {
        questionTextElement.textContent = questionText;
        // 자동 표시 설정에 따라 상태 결정
        if (!autoShowOnEntrySetting) {
          newDisplay.classList.add('collapsed');
          newDisplay.style.display = 'block';
          const collapseButton = newDisplay.querySelector('.question-collapse-btn');
          if (collapseButton) {
            collapseButton.innerHTML = '질문보기';
            collapseButton.title = '질문 내용 보기';
          }
        } else {
          newDisplay.style.display = 'block';
        }
      }
    }
    return;
  }
  
  const questionTextElement = display.querySelector('.question-text');
  debugLog('questionTextElement:', questionTextElement);
  
  if (questionTextElement) {
    questionTextElement.textContent = questionText;
    
    // 자동 표시 설정에 따라 표시 방식 결정
    if (!autoShowOnEntrySetting) {
      // 수동 조작 중이거나 사용자가 설정한 상태가 있으면 상태 변경하지 않음
      if (display.dataset.manualToggle === 'true') {
        debugLog('수동 조작 중이므로 상태 변경 건너뜀 (showQuestion)');
        display.style.display = 'block';
        return;
      }
      
      // 사용자가 이미 펼친 상태라면 그 상태를 유지
      if (display.dataset.userCollapsedState === 'false') {
        debugLog('사용자가 펼친 상태이므로 펼쳐진 상태 유지 (showQuestion)');
        display.classList.remove('collapsed');
        display.style.display = 'block';
        const collapseButton = display.querySelector('.question-collapse-btn');
        if (collapseButton) {
          collapseButton.innerHTML = '접기';
          collapseButton.title = '컴포넌트 접기/펼치기';
        }
        return;
      }
      
      debugLog('자동 표시 설정이 꺼져있어서 접힌 상태로 표시');
      display.classList.add('collapsed');
      display.style.display = 'block';
      const collapseButton = display.querySelector('.question-collapse-btn');
      if (collapseButton) {
        collapseButton.innerHTML = '질문보기';
        collapseButton.title = '질문 내용 보기';
      }
    } else {
      debugLog('자동 표시 설정이 켜져있어서 펼쳐진 상태로 표시');
      display.style.display = 'block';
    }
  }
}

// 질문 표시 숨기기
function hideQuestionDisplay() {
  const display = document.getElementById('current-question-display');
  if (display) {
    display.style.display = 'none';
  }
}

// 현재 질문으로 이동
function navigateToCurrentQuestion() {
  debugLog('navigateToCurrentQuestion 호출됨');
  debugLog('currentQuestionElement:', currentQuestionElement);
  
  if (!currentQuestionElement) {
    debugLog('currentQuestionElement가 없습니다');
    return;
  }
  
  // 화면 상단에서 30% 위치에 질문이 오도록 스크롤
  const rect = currentQuestionElement.getBoundingClientRect();
  debugLog('요소의 현재 위치:', rect);
  
  const elementTop = rect.top + window.scrollY;
  const targetPosition = elementTop - (window.innerHeight * 0.3);
  
  debugLog('스크롤 대상 위치:', targetPosition);
  
  window.scrollTo({
    top: Math.max(0, targetPosition), // 음수 방지
    behavior: getScrollBehavior()
  });
  
  // 질문을 잠시 강조 표시
  const originalBackground = currentQuestionElement.style.backgroundColor;
  const originalTransition = currentQuestionElement.style.transition;
  
  currentQuestionElement.style.transition = 'background-color 0.3s ease';
  currentQuestionElement.style.backgroundColor = '#fef3c7';
  
  setTimeout(() => {
    currentQuestionElement.style.backgroundColor = originalBackground;
    setTimeout(() => {
      currentQuestionElement.style.transition = originalTransition;
    }, 300);
  }, 2000);
}

// DOM 변경 감지
function observeMessages() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const userMessages = node.querySelectorAll('[data-message-author-role="user"]');
            userMessages.forEach(savePromptHistory);
          }
        });
      }
    });

    // 버튼이 제거되었으면 다시 추가
    if (!document.getElementById('prompt-navigator')) {
      addNavigationButtons();
    }
    
    // 질문 표시 컴포넌트가 제거되었으면 다시 추가
    if (!document.getElementById('current-question-display')) {
      createQuestionDisplay();
    }
    
    // 새로운 메시지가 추가되면 질문 표시 업데이트
    setTimeout(updateCurrentQuestion, 500);
    
    // 채팅 데이터 업데이트
    setTimeout(saveChatData, 1000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}


// 현재 테마 가져오기 (다른 함수에서 사용)
function getCurrentTheme() {
  debugLog('getCurrentTheme 호출됨, themeSetting:', themeSetting);
  let theme;
  switch (themeSetting) {
    case 'light':
      theme = 'light';
      break;
    case 'dark':
      theme = 'dark';
      break;
    case 'system':
    default:
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      break;
  }
  debugLog('getCurrentTheme 결과:', theme);
  return theme;
}

// 테마 감지 및 적용
function detectAndApplyTheme() {
  debugLog('detectAndApplyTheme 호출됨, 현재 themeSetting:', themeSetting);
  
  // 테마 적용
  const applyTheme = (theme) => {
    debugLog('applyTheme 호출됨, theme:', theme);
    const extension = document.getElementById('prompt-navigator');
    const questionDisplay = document.getElementById('current-question-display');
    const modal = document.getElementById('prompt-list-modal');
    
    // data-theme 속성 설정
    if (extension) {
      extension.setAttribute('data-theme', theme);
      debugLog('extension에 테마 적용:', theme);
    }
    if (questionDisplay) {
      questionDisplay.setAttribute('data-theme', theme);
      debugLog('questionDisplay에 테마 적용:', theme, 'element:', questionDisplay);
      
      // 질문 표시 컴포넌트 내부 요소들에도 테마 적용
      const questionLabel = questionDisplay.querySelector('.question-label');
      const questionText = questionDisplay.querySelector('.question-text');
      const questionContent = questionDisplay.querySelector('.question-content');
      const buttonGroup = questionDisplay.querySelector('.question-button-group');
      
      if (questionLabel) {
        questionLabel.setAttribute('data-theme', theme);
        debugLog('questionLabel에 테마 적용:', theme);
      }
      if (questionText) {
        questionText.setAttribute('data-theme', theme);
        debugLog('questionText에 테마 적용:', theme);
      }
      if (questionContent) {
        questionContent.setAttribute('data-theme', theme);
      }
      if (buttonGroup) {
        buttonGroup.setAttribute('data-theme', theme);
      }
      
      // 라이트 모드일 때 직접 스타일 적용 (강제)
      if (theme === 'light') {
        questionDisplay.style.setProperty('background', 'rgba(255, 255, 255, 0.95)', 'important');
        questionDisplay.style.setProperty('border-color', '#e5e5e5', 'important');
        questionDisplay.style.setProperty('color', '#333', 'important');
        questionDisplay.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)', 'important');
        debugLog('라이트 모드 직접 스타일 적용됨 (important)');
      } else if (theme === 'dark') {
        questionDisplay.style.setProperty('background', 'rgba(42, 42, 42, 0.95)', 'important');
        questionDisplay.style.setProperty('border-color', '#444', 'important');
        questionDisplay.style.setProperty('color', '#e5e5e5', 'important');
        questionDisplay.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)', 'important');
        debugLog('다크 모드 직접 스타일 적용됨 (important)');
      }
    }
    if (modal) {
      modal.setAttribute('data-theme', theme);
      // 모달 내부 요소들에도 테마 적용
      const modalContent = modal.querySelector('.prompt-list-modal-content');
      if (modalContent) modalContent.setAttribute('data-theme', theme);
    }
    
    // 모든 네비게이션 버튼에 테마 적용
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
      button.setAttribute('data-theme', theme);
      
      // 네비게이션 버튼 스타일 직접 적용
      if (theme === 'light') {
        button.style.setProperty('background', '#f9fafb', 'important');
        button.style.setProperty('color', '#374151', 'important');
        button.style.setProperty('border-color', '#d1d5db', 'important');
      } else if (theme === 'dark') {
        button.style.setProperty('background', '#374151', 'important');
        button.style.setProperty('color', '#f9fafb', 'important');
        button.style.setProperty('border-color', '#4b5563', 'important');
      }
    });
    
    // 모든 질문 관련 버튼에 테마 적용
    const questionButtons = document.querySelectorAll('.question-btn');
    questionButtons.forEach((button, index) => {
      button.setAttribute('data-theme', theme);
      debugLog(`질문 버튼 ${index}에 테마 적용:`, theme, button.className);
      
      // 라이트 모드일 때 버튼 스타일 직접 적용
      if (theme === 'light') {
        if (button.classList.contains('question-copy-btn')) {
          button.style.setProperty('background', '#3b82f6', 'important');
          button.style.setProperty('color', 'white', 'important');
        } else if (button.classList.contains('question-collapse-btn')) {
          button.style.setProperty('background', '#e5e7eb', 'important');
          button.style.setProperty('color', '#374151', 'important');
        } else if (button.classList.contains('question-navigate-btn')) {
          button.style.setProperty('background', '#10a37f', 'important');
          button.style.setProperty('color', 'white', 'important');
        } else if (button.classList.contains('question-hide-btn')) {
          button.style.setProperty('background', '#6b7280', 'important');
          button.style.setProperty('color', 'white', 'important');
        }
      } else if (theme === 'dark') {
        if (button.classList.contains('question-copy-btn')) {
          button.style.setProperty('background', '#1e40af', 'important');
          button.style.setProperty('color', 'white', 'important');
        } else if (button.classList.contains('question-collapse-btn')) {
          button.style.setProperty('background', '#4b5563', 'important');
          button.style.setProperty('color', '#f9fafb', 'important');
        } else if (button.classList.contains('question-navigate-btn')) {
          button.style.setProperty('background', '#059669', 'important');
          button.style.setProperty('color', 'white', 'important');
        } else if (button.classList.contains('question-hide-btn')) {
          button.style.setProperty('background', '#374151', 'important');
          button.style.setProperty('color', '#f9fafb', 'important');
        }
      }
    });
    
    // CSS 커스텀 프로퍼티로 테마 적용
    document.documentElement.style.setProperty('--extension-theme', theme);
    
    debugLog('테마 적용 완료:', theme, '(설정:', themeSetting + ')', '- 질문 표시 컴포넌트:', !!questionDisplay);
  };
  
  // 초기 테마 적용
  const currentTheme = getCurrentTheme();
  debugLog('detectAndApplyTheme에서 getCurrentTheme 결과:', currentTheme);
  applyTheme(currentTheme);
  
  // 시스템 테마를 따르는 경우 시스템 테마 변경 감지
  if (themeSetting === 'system') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener(() => {
      const newTheme = getCurrentTheme();
      debugLog('시스템 테마 변경 감지, 새 테마:', newTheme);
      applyTheme(newTheme);
    });
  }
}

// 초기화
function init() {
  // 네비게이션 버튼 추가
  addNavigationButtons();

  // 질문 표시 컴포넌트 생성
  createQuestionDisplay();

  // 스크롤 이벤트 리스너 추가
  setupScrollListener();

  // DOM 변경 감지 시작
  observeMessages();

  // 기존 메시지들 저장
  const existingMessages = getUserMessages();
  existingMessages.forEach(savePromptHistory);

  // 채팅 데이터 수집 및 저장
  setTimeout(() => {
    saveChatData();
  }, 2000); // 페이지 로드 후 2초 대기

  // 채팅창 진입 시 자동 표시 설정에 따라 초기 질문 표시
  setTimeout(() => {
    // 사용자 메시지가 1개 이하면 질문창 숨기기
    if (existingMessages.length <= 1) {
      debugLog('초기화: 사용자 메시지가 1개 이하이므로 질문창 숨김');
      hideQuestionDisplay();
      return;
    }

    if (autoShowOnEntrySetting && showCurrentQuestionSetting) {
      const display = document.getElementById('current-question-display');
      if (display && existingMessages.length > 0) {
        // 현재 질문 업데이트하여 표시
        updateCurrentQuestion();
      }
    } else if (!autoShowOnEntrySetting && showCurrentQuestionSetting) {
      // 자동 표시가 꺼져있지만 질문 표시는 켜져있으면 접힌 상태로 표시
      debugLog('초기화: 자동 표시 설정이 꺼져있어서 질문창을 접힌 상태로 표시');
      const display = document.getElementById('current-question-display');
      if (display) {
        display.classList.add('collapsed');
        display.style.display = 'block';
        display.dataset.userCollapsedState = 'true'; // 초기 접힌 상태를 사용자 설정으로 저장
        const collapseButton = display.querySelector('.question-collapse-btn');
        if (collapseButton) {
          collapseButton.innerHTML = '질문보기';
          collapseButton.title = '질문 내용 보기';
        }
      }
    } else {
      // 질문 표시 자체가 꺼져있으면 완전히 숨기기
      debugLog('초기화: 질문 표시 설정이 꺼져있어서 질문창 숨김');
      hideQuestionDisplay();
    }
  }, 3000); // 페이지 완전 로드 후 3초 대기

  // 키보드 단축키 리스너
  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? e.metaKey : e.ctrlKey;
    
    if (modifierKey && e.shiftKey) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateToPreviousUserMessage();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateToNextUserMessage();
      } else if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        showPromptListModal();
      } else if (e.key === ';') {
        e.preventDefault();
        // Chrome extension 팝업 열기
        chrome.runtime.sendMessage({ action: 'openPopup' });
      } else if (e.key === 'E' || e.key === 'e') {
        e.preventDefault();
        // Chrome extension 팝업 열기 (CMD+SHIFT+E 단축키)
        chrome.runtime.sendMessage({ action: 'openPopup' });
      }
    }
  });
}

// 메시지 리스너 (popup에서 특정 프롬프트로 스크롤 요청)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrollToPrompt') {
    scrollToSpecificPrompt(message.promptText);
    sendResponse({ success: true });
  } else if (message.action === 'updateSettings') {
    if (message.showCurrentQuestion !== undefined) {
      showCurrentQuestionSetting = message.showCurrentQuestion;
      debugLog('showCurrentQuestionSetting 업데이트됨:', showCurrentQuestionSetting);
      
      // 현재 질문 표시 설정이 변경되면 즉시 상태 반영
      if (!showCurrentQuestionSetting) {
        debugLog('현재 질문 표시 설정이 꺼져서 질문창 숨김');
        hideQuestionDisplay();
      } else if (autoShowOnEntrySetting) {
        // 현재 질문 표시가 켜지고 자동 표시도 켜져있으면 질문 업데이트
        debugLog('현재 질문 표시 설정이 켜져서 질문창 업데이트');
        setTimeout(updateCurrentQuestion, 100);
      }
    }
    if (message.autoShowOnEntry !== undefined) {
      autoShowOnEntrySetting = message.autoShowOnEntry;
      debugLog('autoShowOnEntrySetting 업데이트됨:', autoShowOnEntrySetting);
      
      // 설정 변경 시 사용자 상태 초기화
      const display = document.getElementById('current-question-display');
      if (display) {
        delete display.dataset.manualToggle;
        delete display.dataset.userCollapsedState;
        debugLog('설정 변경으로 인한 사용자 상태 초기화');
      }
      
      // 자동 표시 설정이 변경되면 즉시 상태 반영
      if (!autoShowOnEntrySetting) {
        debugLog('자동 표시 설정이 꺼져서 질문창을 접힌 상태로 변경');
        if (display) {
          display.classList.add('collapsed');
          display.style.display = 'block'; // 접힌 상태로 표시
          const collapseButton = display.querySelector('.question-collapse-btn');
          if (collapseButton) {
            collapseButton.innerHTML = '질문보기';
            collapseButton.title = '질문 내용 보기';
          }
        }
      } else if (showCurrentQuestionSetting) {
        // 자동 표시가 켜지고 현재 질문 표시도 켜져있으면 질문 업데이트
        debugLog('자동 표시 설정이 켜져서 질문창 업데이트');
        if (display) {
          display.classList.remove('collapsed'); // 접힌 상태 해제
          const collapseButton = display.querySelector('.question-collapse-btn');
          if (collapseButton) {
            collapseButton.innerHTML = '접기';
            collapseButton.title = '컴포넌트 접기/펼치기';
          }
        }
        setTimeout(updateCurrentQuestion, 100);
      }
    }
    if (message.questionLines !== undefined) {
      questionLinesSetting = message.questionLines;
      updateQuestionTextHeight();
    }
    if (message.theme !== undefined) {
      themeSetting = message.theme;
      debugLog('테마 설정 변경됨:', themeSetting);
      detectAndApplyTheme();
      // 기존 질문 표시 컴포넌트에 즉시 테마 적용
      setTimeout(() => {
        const questionDisplay = document.getElementById('current-question-display');
        if (questionDisplay) {
          const currentTheme = getCurrentTheme();
          debugLog('기존 질문 표시 컴포넌트에 즉시 테마 적용:', currentTheme);
          questionDisplay.setAttribute('data-theme', currentTheme);
          if (currentTheme === 'light') {
            questionDisplay.style.background = 'rgba(255, 255, 255, 0.95)';
            questionDisplay.style.borderColor = '#e5e5e5';
            questionDisplay.style.color = '#333';
          } else {
            questionDisplay.style.background = 'rgba(42, 42, 42, 0.95)';
            questionDisplay.style.borderColor = '#444';
            questionDisplay.style.color = '#e5e5e5';
          }
        }
      }, 100);
    }
    if (message.scrollSpeed !== undefined) {
      scrollSpeedSetting = message.scrollSpeed;
    }
    if (message.disableScrollAnimation !== undefined) {
      disableScrollAnimationSetting = message.disableScrollAnimation;
    }
    updateQuestionDisplayVisibility();
    sendResponse({ success: true });
  }
});

// 특정 프롬프트 텍스트로 스크롤
function scrollToSpecificPrompt(targetText) {
  const userMessages = getUserMessages();
  
  for (const message of userMessages) {
    const messageText = message.textContent.trim();
    if (messageText === targetText) {
      message.scrollIntoView({ behavior: getScrollBehavior(), block: 'center' });
      
      // 프롬프트를 강조 표시 (2초간)
      message.style.backgroundColor = '#fef3c7';
      message.style.transition = 'background-color 0.3s ease';
      
      setTimeout(() => {
        message.style.backgroundColor = '';
      }, 2000);
      
      break;
    }
  }
}

// DOM에서 현재 채팅 제목 가져오기
function getChatTitleFromDOM() {
  // ChatGPT 페이지에서 채팅 제목을 찾는 여러 선택자 시도
  const titleSelectors = [
    'title', // 페이지 타이틀
    'h1', // 메인 제목
    '[data-testid*="conversation-title"]',
    '[aria-label*="conversation"]',
    '.conversation-title',
    'header h1',
    'main h1'
  ];

  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      let title = element.textContent.trim();
      
      // 페이지 제목에서 "ChatGPT" 등 불필요한 부분 제거
      if (selector === 'title') {
        title = title.replace(/\s*\|\s*ChatGPT.*$/, '').replace(/^ChatGPT\s*[-–]\s*/, '');
      }
      
      if (title && title !== 'ChatGPT' && title.length > 3) {
        return title.length > 50 ? title.substring(0, 50) + '...' : title;
      }
    }
  }

  // 채팅 제목을 찾지 못한 경우 URL에서 추출한 ID 사용
  const match = window.location.href.match(/\/c\/([a-f0-9-]+)/);
  return match ? `채팅 ${match[1].substring(0, 8)}...` : '새 채팅';
}

// 현재 채팅의 모든 질문-답변 쌍 수집
function collectQnAPairs() {
  const currentSite = getCurrentSite();
  const selectors = SITE_SELECTORS[currentSite];
  if (!selectors) return [];

  const userMessages = Array.from(document.querySelectorAll(selectors.userMessage));
  const assistantMessages = Array.from(document.querySelectorAll(selectors.assistantMessage));
  
  const qnaPairs = [];
  
  userMessages.forEach((userMsg, index) => {
    const questionText = userMsg.textContent.trim();
    let answerPreview = '';
    
    // 해당 질문에 대응하는 답변 찾기
    if (index < assistantMessages.length) {
      const answerMsg = assistantMessages[index];
      const answerText = answerMsg.textContent.trim();
      
      // 답변의 첫 줄만 추출
      const firstLine = answerText.split('\n')[0].trim();
      answerPreview = firstLine.length > 80 ? 
        firstLine.substring(0, 80) + '...' : firstLine;
        
      // 답변이 없거나 너무 짧으면 "답변 대기중..." 표시
      if (!answerPreview || answerPreview.length < 5) {
        answerPreview = '답변 대기중...';
      }
    } else {
      answerPreview = '답변 대기중...';
    }
    
    qnaPairs.push({
      question: questionText,
      answerPreview: answerPreview,
      questionElement: userMsg,
      timestamp: new Date().toISOString()
    });
  });
  
  return qnaPairs;
}

// 채팅 데이터를 스토리지에 저장
function saveChatData() {
  try {
    // Extension context가 유효한지 먼저 확인
    if (!chrome.runtime || !chrome.runtime.id) {
      debugLog('Extension context가 유효하지 않습니다');
      return;
    }
    
    const chatId = extractChatId(window.location.href);
    if (chatId === 'unknown') return;
    
    const chatTitle = getChatTitleFromDOM();
    const qnaPairs = collectQnAPairs();
    const currentSite = getCurrentSite();
    
    const chatData = {
      chatId: chatId,
      chatTitle: chatTitle,
      url: window.location.href,
      site: currentSite,
      qnaPairs: qnaPairs,
      lastUpdated: new Date().toISOString()
    };
    
    // Chrome storage API 호출 전에 다시 한 번 context 확인
    if (!chrome.runtime || !chrome.runtime.id) {
      debugLog('Chrome storage 호출 직전에 extension context 무효화됨');
      return;
    }
    
    chrome.storage.local.get(['chatData'], (result) => {
      // Chrome runtime이 여전히 유효한지 확인
      if (!chrome.runtime || !chrome.runtime.id) {
        debugLog('Storage get 콜백에서 extension context 무효화됨');
        return;
      }
      
      // runtime.lastError 체크
      if (chrome.runtime.lastError) {
        debugLog('채팅 데이터 로드 중 에러:', chrome.runtime.lastError);
        return;
      }
      
      const allChats = result.chatData || {};
      allChats[chatId] = chatData;
      
      // Chrome storage set 호출 전에도 context 확인
      if (!chrome.runtime || !chrome.runtime.id) {
        debugLog('Chrome storage set 호출 직전에 extension context 무효화됨');
        return;
      }
      
      chrome.storage.local.set({ chatData: allChats }, () => {
        // Chrome runtime 다시 확인
        if (!chrome.runtime || !chrome.runtime.id) {
          debugLog('Storage set 콜백에서 extension context 무효화됨');
          return;
        }
        
        if (chrome.runtime.lastError) {
          debugLog('채팅 데이터 저장 실패:', chrome.runtime.lastError);
        }
      });
    });
  } catch (error) {
    // Extension context invalidated 등의 에러 처리
    debugLog('saveChatData 실행 중 에러:', error.message);
    if (error.message && error.message.includes('Extension context invalidated')) {
      debugLog('Extension이 reload되었거나 비활성화되었습니다');
    }
  }
}

// URL에서 채팅 ID 추출 (popup.js와 중복이지만 필요)
function extractChatId(url) {
  if (!url) return 'unknown';
  
  // ChatGPT 패턴
  let match = url.match(/\/c\/([a-f0-9-]+)/);
  if (match) return match[1];
  
  // Claude 패턴 (예시)
  match = url.match(/claude\.ai\/chat\/([a-f0-9-]+)/);
  if (match) return match[1];
  
  // Gemini 패턴 (예시)
  match = url.match(/gemini\.google\.com\/chat\/([a-f0-9-]+)/);
  if (match) return match[1];
  
  return 'unknown';
}

// 페이지 로드 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}// Cache bust: 1749548299
