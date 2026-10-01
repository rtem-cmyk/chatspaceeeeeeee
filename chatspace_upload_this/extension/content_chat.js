// Content Script: Инжектор в страницы Live Chat CharmDate
console.log('🚀 ChatSpace Live Chat Injector загружен на странице CharmDate');

// Получение ID анкеты из страницы (например из шапки или cookie)
function extractLadyId() {
  const match = document.body.innerText.match(/([CP]\d{6})/i);
  return match ? match[1].toUpperCase() : 'UNKNOWN_LADY';
}

const currentLadyId = extractLadyId();

// 1. Слушаем команды от бэкенда через background.js
chrome.runtime.onMessage.addListener((cmd, sender, sendResponse) => {
  if (cmd.event === 'EXECUTE_SEND_MESSAGE') {
    const { textToSend } = cmd.payload;
    injectAndSendMessage(textToSend);
  }
});

// Функция ввода и отправки сообщения в активный чат CharmDate
function injectAndSendMessage(text) {
  // Поиск стандартных селекторов поля ввода чата CharmDate
  const inputSelectors = [
    'textarea#msg',
    'textarea[name="msg"]',
    'textarea.chat-input',
    'input[name="message"]',
    '#input_text'
  ];

  let inputEl = null;
  for (const sel of inputSelectors) {
    inputEl = document.querySelector(sel);
    if (inputEl) break;
  }

  if (inputEl) {
    inputEl.value = text;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    // Находим кнопку отправки
    const sendBtnSelectors = [
      'button#send',
      'button[type="submit"]',
      'input[type="submit"]',
      '.btn-send',
      '#btn_send'
    ];

    let sendBtn = null;
    for (const sel of sendBtnSelectors) {
      sendBtn = document.querySelector(sel);
      if (sendBtn) break;
    }

    if (sendBtn) {
      sendBtn.click();
      console.log('✅ ChatSpace: сообщение отправлено в чат CharmDate:', text);
    } else {
      // Отправка по Enter
      const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
      inputEl.dispatchEvent(event);
    }
  } else {
    console.warn('⚠️ ChatSpace: поле ввода чата не найдено на странице');
  }
}

// 2. Наблюдатель за новыми входящими сообщениями (MutationObserver)
function observeIncomingMessages() {
  const chatBox = document.querySelector('#chat_history') || document.querySelector('.chat-container') || document.body;
  if (!chatBox) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          // Проверяем, является ли элемент входящим сообщением от мужчины
          if (el.classList?.contains('msg-in') || el.classList?.contains('from-man') || el.innerText?.includes('Gentleman:')) {
            const text = el.innerText.replace(/^.*?:/, '').trim();
            const manIdMatch = document.body.innerText.match(/Gentleman\s*#?(\d+)/i) || ['0', '123456'];
            const manId = manIdMatch[1];

            chrome.runtime.sendMessage({
              type: 'RELAY_TO_BACKEND',
              event: 'CD_INCOMING_MESSAGE',
              payload: {
                ladyId: currentLadyId,
                manId,
                manName: `Gentleman #${manId}`,
                text,
                manAge: 45,
                manCountry: 'USA'
              }
            });
          }
        }
      }
    }
  });

  observer.observe(chatBox, { childList: true, subtree: true });
}

// Запускаем отслеживание чата
observeIncomingMessages();
