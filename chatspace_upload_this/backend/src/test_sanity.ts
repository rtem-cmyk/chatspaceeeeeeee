import { initDatabase, db } from './db/database.js';
import { encryptPassword, decryptPassword } from './services/crypto.js';

console.log('🧪 Запуск теста инициализации бэкенда...');
initDatabase();

// 1. Тест шифрования
const secret = 'MySuperPass_123!';
const encrypted = encryptPassword(secret);
const decrypted = decryptPassword(encrypted);
console.log('Шифрование пароля:', {
  original: secret,
  encrypted,
  decrypted,
  match: secret === decrypted
});

if (secret !== decrypted) {
  throw new Error('Критическая ошибка: шифрование и дешифрование не совпадают!');
}

// 2. Тест пользователей
const users = db.prepare('SELECT id, username, role, full_name FROM users').all();
console.log('Пользователи в БД:', users);

// 3. Тест анкет
const ladies = db.prepare('SELECT lady_id, name, online_status FROM ladies').all();
console.log('Анкеты в БД:', ladies);

// 4. Тест назначений
const assignments = db.prepare(`
  SELECT oa.id, u.username as operator, oa.lady_id, oa.shift_start, oa.shift_end
  FROM operator_assignments oa
  JOIN users u ON oa.operator_id = u.id
`).all();
console.log('Назначения на операторов:', assignments);

console.log('🎉 Все тесты БД и шифрования успешно пройдены!');
process.exit(0);
