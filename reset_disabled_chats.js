// 비활성화된 채팅 목록 초기화
chrome.storage.local.set({ disabledChats: [] }, () => {
  console.log('비활성화된 채팅 목록이 초기화되었습니다.');
});