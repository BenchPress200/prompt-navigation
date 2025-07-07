// 팝업 스크립트

// 검색 입력창에 포커스를 주는 함수
function focusSearchInput() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.focus();
    searchInput.select(); // 기존 텍스트가 있으면 선택
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  setupTabs();
  setupSettings();
  setupSearch();

  // 팝업이 열리면 즉시 검색창에 포커싱
  focusSearchInput();
  // 로딩 지연 대비 추가 포커싱
  setTimeout(focusSearchInput, 50);
  setTimeout(focusSearchInput, 100);

  // 이벤트 리스너
  document.getElementById('refresh').addEventListener('click', () => {
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    if (activeTab === 'all') {
      loadHistory();
    }
  });
  document.getElementById('clearHistory').addEventListener('click', clearHistory);
});

// 탭 설정
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 모든 탭 비활성화
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // 선택한 탭 활성화
      button.classList.add('active');
      const tabId = `tab-${button.dataset.tab}`;
      document.getElementById(tabId).classList.add('active');

      // 해당 탭 데이터 로드
      if (button.dataset.tab === 'all') {
        loadHistory();
        // "내가 입력한 프롬프트" 탭으로 전환 시 검색창에 포커싱
        setTimeout(() => {
          const searchInput = document.getElementById('searchInput');
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      }
    });
  });
}

// 히스토리 불러오기
function loadHistory() {
  const historyList = document.getElementById('historyList');
  const emptyState = document.getElementById('emptyState');
  
  historyList.innerHTML = '<div class="loading">불러오는 중...</div>';
  emptyState.style.display = 'none';

  // 채팅 데이터와 프롬프트 히스토리를 모두 가져옴
  chrome.storage.local.get(['chatData', 'promptHistory'], (result) => {
    const chatData = result.chatData || {};
    const promptHistory = result.promptHistory || [];

    if (Object.keys(chatData).length === 0 && promptHistory.length === 0) {
      historyList.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    // 채팅 데이터를 기반으로 그룹화
    const groupedHistory = groupByChatData(chatData, promptHistory);
    
    historyList.innerHTML = groupedHistory.map((group, groupIndex) => {
      const date = new Date(group.lastUpdated);
      const timeString = formatTime(date);
      const siteHtml = group.site ? `<span class="site-badge site-${group.site}">${getSiteLabel(group.site)}</span>` : '';
      
      return `
        <div class="history-group" data-group-index="${groupIndex}">
          <div class="group-header">
            <div class="group-prompt">${escapeHtml(group.chatTitle)}</div>
            <div class="group-info">

              <div class="group-info-box">
                <span class="duplicate-count">${group.qnaPairs.length}개의 질문</span>
                ${siteHtml}
              </div>

              <div class="group-info-box">
                <span class="group-time">${timeString}</span>
                <button class="group-toggle">펼치기</button>
              </div>

            </div>
          </div>
          <div class="group-items" style="display: none;">
            ${group.qnaPairs.map((qna, qnaIndex) => {
              return `
                <div class="group-item" data-chat-url="${group.chatUrl}" data-prompt-text="${escapeHtml(qna.question)}">
                  <div class="item-header">
                    <span class="item-number">#${qnaIndex + 1}</span>
                  </div>
                  <div class="item-content">
                    <div class="question-text">${escapeHtml(qna.question.substring(0, 150))}${qna.question.length > 150 ? '...' : ''}</div>
                    ${qna.answerPreview ? `<div class="answer-preview">${escapeHtml(qna.answerPreview)}</div>` : '<div class="answer-preview">답변 대기중...</div>'}
                  </div>
                  <div class="history-item-actions">
                    <button class="action-btn copy-btn" data-text="${escapeHtml(qna.question)}">📋 복사</button>
                    <button class="action-btn navigate-btn" data-chat-url="${group.chatUrl}" data-prompt-text="${escapeHtml(qna.question)}">📍 이동</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // 복사 버튼 이벤트
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.dataset.text;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = '✅ 복사됨';
          setTimeout(() => {
            btn.textContent = '📋 복사';
          }, 1500);
        });
      });
    });

    // 이동 버튼 이벤트 (전체 URL)
    document.querySelectorAll('.open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        if (url) {
          chrome.tabs.create({ url });
        }
      });
    });

    // 특정 프롬프트로 이동 버튼 이벤트
    document.querySelectorAll('.navigate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chatUrl = btn.dataset.chatUrl;
        const promptText = btn.dataset.promptText;
        if (chatUrl && promptText) {
          navigateToPromptInChat(chatUrl, promptText);
        }
      });
    });

    // 그룹 토글 이벤트
    document.querySelectorAll('.group-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = btn.closest('.history-group');
        const items = group.querySelector('.group-items');
        const isOpen = items.style.display !== 'none';
        
        items.style.display = isOpen ? 'none' : 'block';
        btn.textContent = isOpen ? '펼치기' : '접기';
      });
    });
  });
}

// 설정 기능 초기화
function setupSettings() {
  const showCurrentQuestionToggle = document.getElementById('showCurrentQuestion');
  const autoShowOnEntryToggle = document.getElementById('autoShowOnEntry');
  const questionLinesRange = document.getElementById('questionLines');
  const questionLinesValue = document.getElementById('questionLinesValue');
  const themeSelect = document.getElementById('themeSelect');
  const scrollSpeedRange = document.getElementById('scrollSpeed');
  const scrollSpeedValue = document.getElementById('scrollSpeedValue');
  const disableScrollAnimationToggle = document.getElementById('disableScrollAnimation');
  const scrollSpeedSetting = document.getElementById('scrollSpeedSetting');
  
  // 스크롤 속도 라벨 매핑
  const speedLabels = {
    1: '매우 빠름',
    2: '빠름',
    3: '보통',
    4: '느림',
    5: '매우 느림'
  };
  
  // 설정 불러오기
  chrome.storage.local.get(['showCurrentQuestion', 'autoShowOnEntry', 'questionLines', 'theme', 'scrollSpeed', 'disableScrollAnimation'], (result) => {
    showCurrentQuestionToggle.checked = result.showCurrentQuestion !== false; // 기본값은 true
    autoShowOnEntryToggle.checked = result.autoShowOnEntry !== false; // 기본값은 true
    const lines = result.questionLines || 4; // 기본값은 4줄
    questionLinesRange.value = lines;
    questionLinesValue.textContent = `${lines}줄`;
    themeSelect.value = result.theme || 'system'; // 기본값은 시스템 설정 따르기
    const speed = result.scrollSpeed || 3; // 기본값은 3 (보통)
    scrollSpeedRange.value = speed;
    scrollSpeedValue.textContent = speedLabels[speed] || '보통';
    disableScrollAnimationToggle.checked = result.disableScrollAnimation === true; // 기본값은 false
    
    // 애니메이션 비활성화 상태에 따라 속도 설정 활성화/비활성화
    updateScrollSpeedSetting();
    
    // 현재 질문 표시 상태에 따라 자동 표시 설정 활성화/비활성화
    updateAutoShowOnEntryState();
  });
  
  // 현재 질문 표시 설정 변경 시 저장
  showCurrentQuestionToggle.addEventListener('change', () => {
    chrome.storage.local.set({ 
      showCurrentQuestion: showCurrentQuestionToggle.checked 
    });
    
    // 자동 표시 설정 항목 활성화/비활성화
    updateAutoShowOnEntryState();
    
    // content script에 설정 변경 알림
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          showCurrentQuestion: showCurrentQuestionToggle.checked
        });
      }
    });
  });
  
  // 채팅창 진입 시 자동 표시 설정 변경 시 저장
  autoShowOnEntryToggle.addEventListener('change', () => {
    chrome.storage.local.set({ 
      autoShowOnEntry: autoShowOnEntryToggle.checked 
    });
    
    // content script에 설정 변경 알림
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          autoShowOnEntry: autoShowOnEntryToggle.checked
        });
      }
    });
  });
  
  // 질문 줄 수 설정 변경 시 저장
  questionLinesRange.addEventListener('input', () => {
    const lines = parseInt(questionLinesRange.value);
    questionLinesValue.textContent = `${lines}줄`;
    
    chrome.storage.local.set({ 
      questionLines: lines 
    });
    
    // content script에 설정 변경 알림
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          questionLines: lines
        });
      }
    });
  });
  
  // 테마 설정 변경 시 저장
  themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value;
    
    chrome.storage.local.set({ 
      theme: theme 
    });
    
    // content script에 설정 변경 알림
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          theme: theme
        });
      }
    });
  });
  
  // 스크롤 속도 설정 변경 시 저장
  scrollSpeedRange.addEventListener('input', () => {
    const speed = parseInt(scrollSpeedRange.value);
    scrollSpeedValue.textContent = speedLabels[speed] || '보통';
    
    chrome.storage.local.set({ 
      scrollSpeed: speed 
    });
    
    // content script에 설정 변경 알림
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          scrollSpeed: speed
        });
      }
    });
  });
  
  // 애니메이션 비활성화 설정 변경 시 저장
  disableScrollAnimationToggle.addEventListener('change', () => {
    const disabled = disableScrollAnimationToggle.checked;
    
    chrome.storage.local.set({ 
      disableScrollAnimation: disabled
    });
    
    // 속도 설정 활성화/비활성화
    updateScrollSpeedSetting();
    
    // content script에 설정 변경 알림
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          disableScrollAnimation: disabled
        });
      }
    });
  });
  
  
  // 스크롤 속도 설정 활성화/비활성화 함수
  function updateScrollSpeedSetting() {
    if (disableScrollAnimationToggle.checked) {
      scrollSpeedSetting.classList.add('disabled');
    } else {
      scrollSpeedSetting.classList.remove('disabled');
    }
  }
  
  // 자동 표시 설정 활성화/비활성화 함수
  function updateAutoShowOnEntryState() {
    const autoShowSetting = document.getElementById('autoShowOnEntrySetting');
    if (showCurrentQuestionToggle.checked) {
      autoShowSetting.classList.remove('disabled');
    } else {
      autoShowSetting.classList.add('disabled');
      // 현재 질문 표시가 꺼지면 자동 표시도 꺼짐
      autoShowOnEntryToggle.checked = false;
      chrome.storage.local.set({ autoShowOnEntry: false });
    }
  }
}

// 검색 기능 초기화
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  let searchTimeout;
  
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterHistory(searchInput.value);
    }, 300);
  });
}

// 히스토리 필터링
function filterHistory(searchTerm) {
  const historyItems = document.querySelectorAll('.history-item, .history-group');
  
  if (!searchTerm.trim()) {
    // 검색어가 없으면 모든 항목 표시
    historyItems.forEach(item => {
      item.style.display = '';
    });
    return;
  }
  
  try {
    const regex = new RegExp(searchTerm, 'i');
    
    historyItems.forEach(item => {
      const textContent = item.textContent;
      if (regex.test(textContent)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  } catch (e) {
    // 잘못된 정규식인 경우 모든 항목 표시
    historyItems.forEach(item => {
      item.style.display = '';
    });
  }
}

// 히스토리 삭제
function clearHistory() {
  if (confirm('모든 프롬프트 히스토리를 삭제하시겠습니까?')) {
    chrome.runtime.sendMessage({ action: 'clearHistory' }, (response) => {
      if (response.success) {
        loadHistory();
      }
    });
  }
}

// 시간 포맷팅
function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}일 전`;
  } else if (hours > 0) {
    return `${hours}시간 전`;
  } else if (minutes > 0) {
    return `${minutes}분 전`;
  } else {
    return '방금 전';
  }
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 도구 라벨 변환
function getToolLabel(tool) {
  const toolMap = {
    'dalle': '🎨 이미지',
    'browser': '🌐 웹',
    'python': '🐍 코드',
    'search': '🔍 검색',
    'deep_research': '📚 심층'
  };
  return toolMap[tool] || tool;
}

// 상태 HTML 생성
function getStatusHtml(status, responsePreview = '') {
  if (!status || status === 'success') return '';
  
  const statusMap = {
    'pending': '⏳ 대기중',
    'timeout': '⏰ 시간초과',
    'error': '❌ 실패'
  };
  
  const statusText = statusMap[status] || status;
  
  if (status === 'success' && responsePreview) {
    return `<div class="response-preview">${escapeHtml(responsePreview)}...</div>`;
  }
  
  return `<div class="status-indicator status-${status}">${statusText}</div>`;
}

// 상태 텍스트 변환
function getStatusText(status) {
  const statusMap = {
    'pending': '⏳ 대기중',
    'timeout': '⏰ 시간초과',
    'error': '❌ 실패',
    'success': '✅ 완료'
  };
  return statusMap[status] || status;
}

// 채팅 데이터 기반 그룹화
function groupByChatData(chatData, promptHistory) {
  const groups = [];
  
  // 채팅 데이터를 최신순으로 정렬
  const sortedChats = Object.values(chatData).sort((a, b) => 
    new Date(b.lastUpdated) - new Date(a.lastUpdated)
  );
  
  sortedChats.forEach(chat => {
    const group = {
      chatId: chat.chatId,
      chatTitle: chat.chatTitle,
      chatUrl: chat.url,
      site: chat.site,
      qnaPairs: chat.qnaPairs || [],
      lastUpdated: chat.lastUpdated
    };
    
    groups.push(group);
  });
  
  return groups;
}

// 채팅 URL에서 채팅 ID 추출
function extractChatId(url) {
  if (!url) return 'unknown';
  
  const match = url.match(/\/c\/([a-f0-9-]+)/);
  return match ? match[1] : 'unknown';
}

// 채팅 제목 가져오기 (저장된 히스토리에서 추출)
function getChatTitle(chatId) {
  if (chatId === 'unknown') return '알 수 없는 채팅';
  
  // 임시로 chatId 기반 제목 생성 (실제로는 히스토리에서 chatTitle 사용)
  return `채팅 ${chatId.substring(0, 8)}...`;
}

// 사이트 라벨 변환 (ChatGPT만 지원)
function getSiteLabel(site) {
  const siteMap = {
    'chatgpt': '🤖 ChatGPT'
  };
  return siteMap[site] || site;
}

// 특정 채팅의 특정 프롬프트로 이동
function navigateToPromptInChat(chatUrl, promptText) {
  // 현재 활성 탭의 URL 확인
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentTab = tabs[0];
    const currentUrl = currentTab.url;
    
    // 현재 탭의 URL과 목적지 URL이 같은지 확인
    if (currentUrl === chatUrl) {
      // 같은 탭에서 스크롤만 이동
      chrome.tabs.sendMessage(currentTab.id, {
        action: 'scrollToPrompt',
        promptText: promptText
      });
    } else {
      // 다른 URL이므로 새 탭에서 열기
      chrome.tabs.create({ url: chatUrl }, (tab) => {
        // 탭이 로드되면 특정 프롬프트로 스크롤하도록 메시지 전송
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            
            // content script에 특정 프롬프트로 스크롤하라는 메시지 전송
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                action: 'scrollToPrompt',
                promptText: promptText
              });
            }, 1000); // 1초 후 실행 (페이지 완전 로드 대기)
          }
        });
      });
    }
  });
}