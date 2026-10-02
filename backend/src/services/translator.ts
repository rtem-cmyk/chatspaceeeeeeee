import { CONFIG } from '../config.js';

interface TranslationCache {
  [key: string]: string;
}

const memoryCache: TranslationCache = {};

/**
 * Сервис мгновенного двустороннего перевода текста (RU <-> EN).
 * Поддерживает как DeepL API (при наличии ключа), так и мгновенный бесплатный движок.
 */
export async function translateText(
  text: string,
  targetLang: 'en' | 'ru' = 'en',
  sourceLang: 'auto' | 'ru' | 'en' = 'auto'
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const cacheKey = `${sourceLang}_${targetLang}_${trimmed}`;
  if (memoryCache[cacheKey]) {
    return memoryCache[cacheKey];
  }

  // Если указан официальный ключ DeepL
  if (CONFIG.TRANSLATOR_DEEPL_KEY) {
    try {
      const resp = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${CONFIG.TRANSLATOR_DEEPL_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          text: trimmed,
          target_lang: targetLang.toUpperCase()
        })
      });
      const data = await resp.json() as { translations?: Array<{ text: string }> };
      if (data.translations && data.translations[0]) {
        const translated = data.translations[0].text;
        memoryCache[cacheKey] = translated;
        return translated;
      }
    } catch (e) {
      console.warn('DeepL API недоступен, переключаемся на резервный переводчик:', e);
    }
  }

  // Резервный надежный и быстрый веб-движок перевода
  try {
    const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
    const tl = targetLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(trimmed)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Статус ответа переводчика: ${response.status}`);
    }
    const result = await response.json() as any;
    
    // Результат имеет структуру [[["Перевод", "Оригинал", ...]]]
    if (Array.isArray(result) && Array.isArray(result[0])) {
      const translated = result[0].map((item: any) => item[0]).join('');
      memoryCache[cacheKey] = translated;
      return translated;
    }
  } catch (err) {
    console.error('Ошибка сервиса перевода:', err);
  }

  // Если всё не удалось, возвращаем исходный текст
  return trimmed;
}
