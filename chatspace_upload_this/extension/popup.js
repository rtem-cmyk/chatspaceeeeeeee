document.addEventListener('DOMContentLoaded', () => {
  const tokenInput = document.getElementById('token-input');
  const saveBtn = document.getElementById('save-btn');
  const statusText = document.getElementById('status-text');
  const ind = document.getElementById('ind');

  // Читаем сохраненный токен
  chrome.storage.local.get(['cs_token'], (res) => {
    if (res.cs_token) {
      tokenInput.value = res.cs_token;
      statusText.innerText = 'Подключено к ChatSpace';
      ind.style.background = '#10b981';
    } else {
      statusText.innerText = 'Ожидание авторизации';
      ind.style.background = '#f59e0b';
    }
  });

  saveBtn.addEventListener('click', () => {
    const val = tokenInput.value.trim();
    if (val) {
      chrome.storage.local.set({ cs_token: val }, () => {
        statusText.innerText = 'Токен сохранён!';
        ind.style.background = '#10b981';
      });
    }
  });
});
