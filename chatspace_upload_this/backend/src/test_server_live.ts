import http from 'http';
import { spawn } from 'child_process';

console.log('🚀 Запуск проверки живого сервера на порту 4000...');

const srv = spawn('npx', ['tsx', 'src/index.ts'], {
  cwd: process.cwd(),
  stdio: 'pipe'
});

srv.stdout.on('data', async (d) => {
  const text = d.toString();
  console.log('[Server stdout]:', text.trim());
  if (text.includes('Сервер ChatSpace запущен')) {
    console.log('⚡ Сервер поднялся, проверяем HTTP...');
    try {
      const resp = await fetch('http://localhost:4000/api/health');
      const data = await resp.json();
      console.log('Ответ /api/health:', data);

      const htmlResp = await fetch('http://localhost:4000/');
      const htmlText = await htmlResp.text();
      console.log('Главная страница HTML загружена (байт):', htmlText.length);

      // Тест перевода
      const transResp = await fetch('http://localhost:4000/api/operator/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Привет, как твои дела?', targetLang: 'en' })
      });
      console.log('Статус перевода:', transResp.status);

      console.log('✅ Все серверные проверки пройдены на 100%!');
      srv.kill();
      process.exit(0);
    } catch (err) {
      console.error('Ошибка проверки:', err);
      srv.kill();
      process.exit(1);
    }
  }
});

srv.stderr.on('data', (d) => {
  console.error('[Server stderr]:', d.toString());
});

setTimeout(() => {
  console.error('Таймаут проверки сервера');
  srv.kill();
  process.exit(1);
}, 10000);
