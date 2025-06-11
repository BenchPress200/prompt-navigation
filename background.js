// Background Service Worker

// 익스텐션 설치 시
chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatGPT Navigator 설치됨');
  
  // 초기 스토리지 설정
  chrome.storage.local.set({
    promptHistory: []
  });
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPromptHistory') {
    chrome.storage.local.get(['promptHistory'], (result) => {
      sendResponse(result.promptHistory || []);
    });
    return true; // 비동기 응답을 위해 true 반환
  }
  
  if (request.action === 'clearHistory') {
    chrome.storage.local.set({ 
      promptHistory: [],
      chatData: {}
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'openPopup') {
    // Chrome extension 팝업 프로그래밍 방식으로 열기
    // chrome.action.openPopup()은 user gesture가 필요하므로 대안 사용
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 420,
      height: 600
    }, (window) => {
      sendResponse({ success: true, windowId: window.id });
    });
    return true;
  }
});

// 탭 업데이트 감지 - chrome.tabs API가 존재하는 경우에만 등록
if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    try {
      // changeInfo가 없는 경우 처리하지 않음
      if (!changeInfo || changeInfo.status !== 'complete') {
        return;
      }
      
      // tab 객체가 없는 경우 처리하지 않음
      if (!tab) {
        return;
      }
      
      // tab.url이 없는 경우 별도로 탭 정보를 가져옴
      if (!tab.url && chrome.tabs && chrome.tabs.get) {
        chrome.tabs.get(tabId, (tabInfo) => {
          if (chrome.runtime.lastError || !tabInfo || !tabInfo.url) {
            return;
          }
          
          const url = String(tabInfo.url);
          if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
            // Content script에 메시지 전송 시도
            chrome.tabs.sendMessage(tabId, { action: 'reinitialize' }, () => {
              // 에러는 무시 (content script가 없을 수 있음)
              chrome.runtime.lastError;
            });
          }
        });
        return;
      }
      
      // URL이 있는 경우 직접 처리
      const url = String(tab.url || '');
      
      // ChatGPT 도메인인지 확인
      if (url && (url.includes('chatgpt.com') || url.includes('chat.openai.com'))) {
        // Content script에 메시지 전송 시도
        chrome.tabs.sendMessage(tabId, { action: 'reinitialize' }, () => {
          // 에러는 무시 (content script가 없을 수 있음)
          chrome.runtime.lastError;
        });
      }
    } catch (error) {
      // 탭 업데이트 처리 중 에러는 무시
      console.error('탭 업데이트 처리 중 에러:', error);
    }
  });
}