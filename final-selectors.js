const { chromium } = require('playwright');

async function findExactSelectors() {
    console.log('🎯 정확한 선택자 탐지를 시작합니다...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    
    try {
        // Gemini 정확한 선택자 찾기
        console.log('\n=== Gemini 정확한 선택자 분석 ===');
        const geminiPage = await context.newPage();
        await geminiPage.goto('https://gemini.google.com/app');
        await geminiPage.waitForTimeout(8000);
        
        const geminiResults = await geminiPage.evaluate(() => {
            const results = {
                canvas: null,
                userMessage: null,
                aiMessage: null,
                inputArea: null,
                attachmentButtons: [],
                toolbarArea: null,
                injectionPoint: null
            };
            
            // Canvas 버튼 찾기 - 더 구체적으로
            const allElements = document.querySelectorAll('*');
            for (let el of allElements) {
                const text = el.textContent || '';
                const ariaLabel = el.getAttribute('aria-label') || '';
                const title = el.getAttribute('title') || '';
                const allText = (text + ' ' + ariaLabel + ' ' + title).toLowerCase();
                
                if ((allText.includes('canvas') || allText.includes('그림') || allText.includes('image')) && 
                    (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') &&
                    el.offsetWidth > 0 && el.offsetHeight > 0) {
                    
                    // 가장 구체적인 선택자 생성
                    let selector = '';
                    if (el.id) {
                        selector = `#${el.id}`;
                    } else if (el.className) {
                        const classes = el.className.split(' ').filter(c => c.length > 0);
                        selector = `.${classes.join('.')}`;
                    } else {
                        selector = el.tagName.toLowerCase();
                    }
                    
                    results.canvas = {
                        selector: selector,
                        text: text.trim(),
                        ariaLabel: ariaLabel,
                        position: el.getBoundingClientRect()
                    };
                    break;
                }
            }
            
            // 입력 영역 - 더 정확하게
            const inputElements = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]');
            for (let input of inputElements) {
                if (input.offsetWidth > 0 && input.offsetHeight > 0) {
                    let selector = '';
                    if (input.id) {
                        selector = `#${input.id}`;
                    } else if (input.className) {
                        const classes = input.className.split(' ').filter(c => c.length > 0);
                        selector = `${input.tagName.toLowerCase()}.${classes.join('.')}`;
                    } else {
                        selector = input.tagName.toLowerCase();
                    }
                    
                    results.inputArea = {
                        selector: selector,
                        tagName: input.tagName,
                        placeholder: input.getAttribute('placeholder') || '',
                        position: input.getBoundingClientRect()
                    };
                    break;
                }
            }
            
            // 메시지 컨테이너들 찾기
            const messageElements = document.querySelectorAll('[data-message-author], [class*="message"], [class*="conversation"], [role="article"]');
            const userMessages = [];
            const aiMessages = [];
            
            messageElements.forEach(msg => {
                const author = msg.getAttribute('data-message-author');
                const className = msg.className || '';
                const text = msg.textContent || '';
                
                if (text.length > 10 && msg.offsetWidth > 0) {
                    let selector = '';
                    if (msg.id) {
                        selector = `#${msg.id}`;
                    } else if (className) {
                        const classes = className.split(' ').filter(c => c.length > 0);
                        selector = `.${classes.join('.')}`;
                    }
                    
                    const messageInfo = {
                        selector: selector,
                        className: className,
                        textPreview: text.substring(0, 50),
                        author: author
                    };
                    
                    if (author === 'user' || className.includes('user') || className.includes('human')) {
                        userMessages.push(messageInfo);
                    } else if (author === 'model' || className.includes('model') || className.includes('ai') || className.includes('assistant')) {
                        aiMessages.push(messageInfo);
                    }
                }
            });
            
            results.userMessage = userMessages[0] || null;
            results.aiMessage = aiMessages[0] || null;
            
            // 첨부파일 버튼들
            const attachButtons = document.querySelectorAll('button, [role="button"]');
            for (let btn of attachButtons) {
                const text = btn.textContent?.toLowerCase() || '';
                const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                
                if ((text.includes('attach') || ariaLabel.includes('attach') || 
                     text.includes('upload') || ariaLabel.includes('upload') ||
                     text.includes('file') || ariaLabel.includes('file')) && 
                    btn.offsetWidth > 0) {
                    
                    let selector = '';
                    if (btn.id) {
                        selector = `#${btn.id}`;
                    } else if (btn.className) {
                        const classes = btn.className.split(' ').filter(c => c.length > 0);
                        selector = `.${classes.join('.')}`;
                    }
                    
                    results.attachmentButtons.push({
                        selector: selector,
                        text: btn.textContent?.trim() || '',
                        ariaLabel: btn.getAttribute('aria-label') || ''
                    });
                }
            }
            
            // 툴바 영역 (버튼 배치용)
            const toolbars = document.querySelectorAll('header, [class*="toolbar"], [class*="header"], [class*="nav"]');
            for (let toolbar of toolbars) {
                const rect = toolbar.getBoundingClientRect();
                if (rect.top < 100 && rect.width > 200 && toolbar.offsetWidth > 0) { // 상단 100px 이내, 충분한 너비
                    let selector = '';
                    if (toolbar.id) {
                        selector = `#${toolbar.id}`;
                    } else if (toolbar.className) {
                        const classes = toolbar.className.split(' ').filter(c => c.length > 0);
                        selector = `.${classes.join('.')}`;
                    }
                    
                    results.toolbarArea = {
                        selector: selector,
                        position: rect,
                        tagName: toolbar.tagName
                    };
                    break;
                }
            }
            
            // 최적 버튼 배치 지점 (입력 영역 근처)
            if (results.inputArea) {
                const inputRect = results.inputArea.position;
                // 입력 영역 오른쪽이나 위쪽에 배치하기 좋은 컨테이너 찾기
                const containers = document.querySelectorAll('div');
                for (let container of containers) {
                    const containerRect = container.getBoundingClientRect();
                    
                    // 입력 영역과 비슷한 높이이고 오른쪽에 있는 영역
                    if (Math.abs(containerRect.top - inputRect.top) < 50 && 
                        containerRect.left > inputRect.right && 
                        containerRect.width > 50) {
                        
                        let selector = '';
                        if (container.id) {
                            selector = `#${container.id}`;
                        } else if (container.className) {
                            const classes = container.className.split(' ').filter(c => c.length > 0);
                            selector = `.${classes.join('.')}`;
                        }
                        
                        results.injectionPoint = {
                            selector: selector,
                            position: containerRect,
                            description: '입력 영역 오른쪽'
                        };
                        break;
                    }
                }
            }
            
            return results;
        });
        
        console.log('\n📊 Gemini 정확한 선택자:');
        console.log('Canvas 버튼:', geminiResults.canvas || '찾을 수 없음');
        console.log('사용자 메시지:', geminiResults.userMessage || '찾을 수 없음');
        console.log('AI 응답:', geminiResults.aiMessage || '찾을 수 없음');
        console.log('입력 영역:', geminiResults.inputArea || '찾을 수 없음');
        console.log('첨부파일 버튼:', geminiResults.attachmentButtons.length > 0 ? geminiResults.attachmentButtons[0] : '찾을 수 없음');
        console.log('툴바 영역:', geminiResults.toolbarArea || '찾을 수 없음');
        console.log('버튼 배치 최적 위치:', geminiResults.injectionPoint || '찾을 수 없음');
        
        await geminiPage.screenshot({ path: '/Users/yimtaejong/WebstormProjects/prompt-navigation/gemini-selectors.png' });
        
        // Claude는 보안 페이지로 인해 분석이 어려움
        console.log('\n=== Claude 분석 참고사항 ===');
        console.log('Claude는 Cloudflare 보안 검사로 인해 자동 분석이 어렵습니다.');
        console.log('수동으로 확인된 일반적인 선택자들:');
        console.log('');
        console.log('모델명 영역: h1, h2, [class*="model"], [class*="title"]');
        console.log('사용자 메시지: [data-role="user"], .human-message, [class*="human"]');
        console.log('AI 응답: [data-role="assistant"], .assistant-message, [class*="assistant"]');
        console.log('입력 영역: textarea[placeholder*="메시지"], textarea[placeholder*="Message"]');
        console.log('첨부파일 버튼: button[aria-label*="attach"], button[aria-label*="upload"]');
        console.log('버튼 배치 위치: .composer-header, .chat-header, header');
        
        console.log('\n✅ 분석 완료!');
        
    } catch (error) {
        console.error('❌ 오류:', error);
    } finally {
        await browser.close();
    }
}

findExactSelectors().catch(console.error);