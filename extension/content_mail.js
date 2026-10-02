// Content Script: Управление письмами Admirer Mail и перехват капчи CharmDate
console.log('📬 ChatSpace Mail & Captcha Module загружен');

function extractLadyIdFromMailPage() {
  const match = document.body.innerText.match(/([CP]\d{6})/i);
  return match ? match[1].toUpperCase() : 'UNKNOWN_LADY';
}

const currentLadyIdForMail = extractLadyIdFromMailPage();

// 1. Поиск элементов капчи на странице Admirer Mail
function checkAndCaptureCaptcha() {
  const captchaImg = document.querySelector('img[src*="captcha"]') || 
                     document.querySelector('img[src*="verification"]') ||
                     document.querySelector('img[src*="vcode"]');

  const captchaInput = document.querySelector('input[name*="verification"]') || 
                       document.querySelector('input[name*="vcode"]') ||
                       document.querySelector('input[name*="checkcode"]');

  if (captchaImg && captchaInput) {
    console.log('🚨 Обнаружена капча CharmDate! Отправляем оператору в мультичат...');

    // Конвертируем изображение капчи в Base64 (если доступно) или берем src
    let imageSrc = (captchaImg as HTMLImageElement).src;

    chrome.runtime.sendMessage({
      type: 'RELAY_TO_BACKEND',
      event: 'CD_CAPTCHA_REQUEST',
      payload: {
        ladyId: currentLadyIdForMail,
        captchaImageBase64: imageSrc,
        actionType: 'Admirer Mail Verification'
      }
    });
  }
}

// 2. Слушаем решение капчи от оператора
chrome.runtime.onMessage.addListener((cmd, sender, sendResponse) => {
  if (cmd.event === 'SUBMIT_CAPTCHA_SOLUTION') {
    const { captchaCode } = cmd.payload;
    console.log('🔑 Получен код капчи от оператора:', captchaCode);

    const captchaInput = document.querySelector('input[name*="verification"]') || 
                         document.querySelector('input[name*="vcode"]') ||
                         document.querySelector('input[name*="checkcode"]') as HTMLInputElement;

    if (captchaInput) {
      captchaInput.value = captchaCode;
      captchaInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Нажимаем кнопку Submit
      const submitBtn = document.querySelector('input[type="submit"][value*="Submit"]') ||
                        document.querySelector('button[type="submit"]') as HTMLElement;

      if (submitBtn) {
        submitBtn.click();
        console.log('✅ Капча успешно введена и отправлена на проверку CharmDate');
      }
    }
  }
});

// Проверяем страницу через секунду после загрузки
setTimeout(checkAndCaptureCaptcha, 1500);
