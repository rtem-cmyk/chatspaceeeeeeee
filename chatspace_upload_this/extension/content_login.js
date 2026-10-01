// Content Script: Авто-логин на странице CharmDate
console.log('🚀 ChatSpace: Скрипт авто-логина запущен');

chrome.runtime.onMessage.addListener((cmd, sender, sendResponse) => {
  if (cmd.event === 'EXECUTE_LOGIN') {
    const { ladyId, password } = cmd.payload;
    console.log('Попытка входа для анкеты:', ladyId);

    // Ищем поля по точным селекторам с сайта
    const idInput = document.querySelector('input[name="profileid"]');
    const passInput = document.querySelector('input[name="password"]');
    const captchaImg = document.querySelector('img[src*="gif_auth.php"]');

    if (idInput && passInput) {
      // Заполняем логин и пароль
      idInput.value = ladyId;
      passInput.value = password;
      
      // Генерируем события ввода
      idInput.dispatchEvent(new Event('change', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Если есть капча, забираем её и отправляем оператору в ChatSpace
      if (captchaImg) {
        // Конвертируем картинку капчи в Base64 для передачи в ChatSpace
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const base64Captcha = canvas.toDataURL('image/png');
          
          chrome.runtime.sendMessage({
            type: 'RELAY_TO_BACKEND',
            event: 'CD_CAPTCHA_REQUEST',
            payload: {
              ladyId,
              captchaImageBase64: base64Captcha
            }
          });
        };
        img.src = captchaImg.src;
      } else {
        // Если капчи нет (такое бывает), сразу жмем вход
        const submitBtn = document.querySelector('input[name="imageField"]');
        if (submitBtn) submitBtn.click();
      }
    }
  }

  // Получили решение капчи от оператора из интерфейса ChatSpace
  if (cmd.event === 'SUBMIT_CAPTCHA_SOLUTION') {
    const { solution } = cmd.payload;
    const authInput = document.querySelector('input[name="authcode"]');
    const submitBtn = document.querySelector('input[name="imageField"]');

    if (authInput && submitBtn) {
      authInput.value = solution;
      authInput.dispatchEvent(new Event('change', { bubbles: true }));
      submitBtn.click(); // Отправляем форму
    }
  }
});
