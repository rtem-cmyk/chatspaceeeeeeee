// Background Service Worker для ChatSpace CharmDate Bridge
const BACKEND_WS = 'ws://localhost:4000';
const BACKEND_API = 'http://localhost:4000/api';

let socket = null;
let currentToken = null;

// Инициализация соединения с локальным бэкендом
function connectWebSocket(token) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  currentToken = token;
  const wsUrl = `${BACKEND_WS}?token=${token}&type=EXTENSION`;
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('✅ ChatSpace Bridge: подключен к бэкенду на порту 4000');
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📩 Команда от бэкенда:', data.event);
      handleBackendCommand(data);
    } catch (e) {
      console.error(e);
    }
  };

  socket.onclose = () => {
    console.log('❌ Связь с бэкендом потеряна, переподключение через 5 сек...');
    setTimeout(() => {
      if (currentToken) connectWebSocket(currentToken);
    }, 5000);
  };
}

// Загружаем токен из хранилища Chrome
chrome.storage.local.get(['cs_token'], (res) => {
  if (res.cs_token) {
    connectWebSocket(res.cs_token);
  }
});

// Слушаем сохранение токена из всплывающего окна расширения
chrome.storage.onChanged.addListener((changes) => {
  if (changes.cs_token && changes.cs_token.newValue) {
    connectWebSocket(changes.cs_token.newValue);
  }
});

// Обработка команд от бэкенда в активные вкладки CharmDate
function handleBackendCommand(cmd) {
  chrome.tabs.query({ url: ["*://*.charmingdate.com/*", "*://*.charmdate.com/*"] }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, cmd).catch(() => {});
      }
    }
  });
}

// Прием сообщений от Content Scripts (из страниц CharmDate)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'RELAY_TO_BACKEND' && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      event: request.event,
      payload: request.payload
    }));
    sendResponse({ status: 'sent_to_backend' });
  }

  // Запрос учетных данных анкеты для авто-логина (без раскрытия оператору)
  if (request.type === 'FETCH_LADY_CREDENTIALS') {
    chrome.storage.local.get(['cs_token'], async (res) => {
      if (!res.cs_token) {
        sendResponse({ error: 'Не авторизован в ChatSpace' });
        return;
      }
      try {
        const resp = await fetch(`${BACKEND_API}/extension/lady-credentials/${request.ladyId}`, {
          headers: { Authorization: `Bearer ${res.cs_token}` }
        });
        const creds = await resp.json();
        sendResponse(creds);
      } catch (err) {
        sendResponse({ error: 'Ошибка соединения с сервером' });
      }
    });
    return true; // Асинхронный ответ
  }
});
