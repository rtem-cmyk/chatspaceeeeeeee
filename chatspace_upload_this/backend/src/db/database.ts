import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config.js';
import { encryptPassword } from '../services/crypto.js';

export const db = new DatabaseSync(CONFIG.DB_PATH);

// Инициализация структуры таблиц
export function initDatabase() {
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('OWNER', 'OPERATOR')),
      commission_percentage INTEGER DEFAULT 40,
      full_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ladies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lady_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      proxy_url TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused')),
      online_status TEXT DEFAULT 'offline' CHECK(online_status IN ('offline', 'online', 'in_chat')),
      daily_admirer_limit INTEGER DEFAULT 50,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operator_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER NOT NULL,
      lady_id TEXT NOT NULL,
      shift_start TEXT DEFAULT '08:00',
      shift_end TEXT DEFAULT '20:00',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(operator_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(lady_id) REFERENCES ladies(lady_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lady_id TEXT NOT NULL,
      man_id TEXT NOT NULL,
      man_name TEXT,
      man_age INTEGER,
      man_country TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'closed')),
      started_at TEXT DEFAULT (datetime('now')),
      last_activity TEXT DEFAULT (datetime('now')),
      UNIQUE(lady_id, man_id, status)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER,
      lady_id TEXT NOT NULL,
      man_id TEXT NOT NULL,
      sender_type TEXT NOT NULL CHECK(sender_type IN ('lady', 'man', 'system')),
      text TEXT NOT NULL,
      translated_text TEXT,
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invites_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lady_id TEXT NOT NULL,
      man_id TEXT NOT NULL,
      man_name TEXT,
      template_text TEXT,
      status TEXT DEFAULT 'sent',
      sent_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admirer_mails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lady_id TEXT NOT NULL,
      man_id TEXT NOT NULL,
      category TEXT CHECK(category IN ('A', 'B')),
      template_title TEXT,
      content TEXT,
      status TEXT DEFAULT 'sent',
      sent_date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('invite', 'quick_reply', 'admirer_a', 'admirer_b', 'first_emf')),
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fans_crm (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lady_id TEXT NOT NULL,
      man_id TEXT NOT NULL,
      man_name TEXT,
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      spent_credits REAL DEFAULT 0,
      last_chat_date TEXT,
      eligible_for_first_emf INTEGER DEFAULT 0,
      first_emf_sent_count INTEGER DEFAULT 0,
      last_first_emf_time TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(lady_id, man_id)
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT DEFAULT (date('now')),
      lady_id TEXT NOT NULL,
      operator_id INTEGER,
      invites_sent INTEGER DEFAULT 0,
      admirer_sent INTEGER DEFAULT 0,
      chats_count INTEGER DEFAULT 0,
      chat_minutes INTEGER DEFAULT 0,
      estimated_credits REAL DEFAULT 0,
      UNIQUE(date, lady_id, operator_id)
    );

    CREATE TABLE IF NOT EXISTS incoming_mails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lady_id TEXT NOT NULL,
      man_id TEXT NOT NULL,
      man_name TEXT,
      mail_id TEXT,
      subject TEXT,
      content TEXT,
      is_read INTEGER DEFAULT 0,
      received_at TEXT DEFAULT (datetime('now')),
      UNIQUE(lady_id, mail_id)
    );

    CREATE TABLE IF NOT EXISTS sender_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lady_id TEXT NOT NULL,
      operator_id INTEGER NOT NULL,
      target_audience TEXT NOT NULL CHECK(target_audience IN ('online', 'offline', 'all', 'viewers')),
      template_text TEXT NOT NULL,
      status TEXT DEFAULT 'stopped' CHECK(status IN ('stopped', 'running')),
      sent_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER,
      lady_id TEXT,
      man_id TEXT,
      action_type TEXT,
      credits REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  // Проверяем наличие пользователя Owner
  const checkOwner = db.prepare('SELECT id FROM users WHERE username = ?');
  const existingOwner = checkOwner.get('admin');

  if (!existingOwner) {
    const salt = bcrypt.genSaltSync(10);
    const hashAdmin = bcrypt.hashSync('admin123', salt);
    const hashOperator = bcrypt.hashSync('operator123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, full_name, commission_percentage)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run('admin', hashAdmin, 'OWNER', 'Владелец агентства (Овнер)', 0);
    insertUser.run('operator1', hashOperator, 'OPERATOR', 'Светлана (Оператор 1)', 40);
    console.log('✅ Инициализированы стандартные пользователи: admin/admin123 и operator1/operator123');
  }

  // Добавляем тестовые анкеты для демонстрации
  const checkLady = db.prepare('SELECT id FROM ladies LIMIT 1');
  const existingLady = checkLady.get();
  if (!existingLady) {
    const insertLady = db.prepare(`
      INSERT INTO ladies (lady_id, name, password_encrypted, proxy_url, status, online_status, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertLady.run('C332505', 'Анна (Kyiv)', encryptPassword('secret_anna_pass'), '', 'active', 'online', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150');
    insertLady.run('P580502', 'Елена (Odesa)', encryptPassword('secret_elena_pass'), '', 'active', 'online', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
    insertLady.run('C806859', 'Марина (Kharkiv)', encryptPassword('secret_marina_pass'), '', 'active', 'offline', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150');

    // Назначаем первые две анкеты на оператора 1
    const getOperator = db.prepare("SELECT id FROM users WHERE username = 'operator1'").get() as { id: number };
    if (getOperator) {
      const assign = db.prepare(`
        INSERT INTO operator_assignments (operator_id, lady_id, shift_start, shift_end)
        VALUES (?, ?, '08:00', '20:00')
      `);
      assign.run(getOperator.id, 'C332505');
      assign.run(getOperator.id, 'P580502');
    }
  }

  // Добавляем базовые шаблоны
  const checkTemplate = db.prepare('SELECT id FROM templates LIMIT 1');
  if (!checkTemplate.get()) {
    const insertTpl = db.prepare('INSERT INTO templates (type, title, text) VALUES (?, ?, ?)');
    insertTpl.run('invite', 'Теплое приветствие', 'Hello dear! How is your day going? I saw your nice smile and couldn\'t pass by :)');
    insertTpl.run('invite', 'Вопрос про хобби', 'Hi! I noticed we might have a lot in common. What do you like to do on cozy evenings?');
    insertTpl.run('invite', 'Комплимент', 'Hey! You have very kind and thoughtful eyes. Where are you from?');
    insertTpl.run('quick_reply', 'Интерес к планам', 'I would love to learn more about your country and culture! Have you ever traveled to Europe?');
    insertTpl.run('quick_reply', 'Улыбка', 'That sounds wonderful! You really make me smile today.');
    insertTpl.run('admirer_a', 'Знакомство (Категория A)', 'Dear friend, I was browsing profiles and your charming smile immediately caught my attention. I would be thrilled to get to know you better. Hope to hear from you soon!');
    insertTpl.run('admirer_b', 'Открытка (Категория B)', 'Sending you a warm cup of coffee and my warmest smile! Wishing you a bright and beautiful day.');
    insertTpl.run('first_emf', 'First EMF после чата', 'My dear! I enjoyed our chat so much today, but it ended so quickly. I wanted to write you this letter so we don\'t lose connection. Tell me, how does your ideal weekend look like?');
  }
}
