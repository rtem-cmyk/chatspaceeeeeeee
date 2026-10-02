import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, AuthRequest } from '../services/auth.js';
import { translateText } from '../services/translator.js';

export const operatorRouter = Router();

operatorRouter.use(requireAuth);

// 1. Получить только назначенных девушек текущего оператора
operatorRouter.get('/my-ladies', (req: AuthRequest, res) => {
  const operatorId = req.user!.id;
  const isOwner = req.user!.role === 'OWNER';

  let query = `
    SELECT 
      l.id, l.lady_id, l.name, l.status, l.online_status, 
      l.daily_admirer_limit, l.avatar_url,
      oa.shift_start, oa.shift_end
    FROM ladies l
  `;

  let ladies;
  if (isOwner) {
    // Овнер видит всех девушек
    ladies = db.prepare(query + `
      LEFT JOIN operator_assignments oa ON l.lady_id = oa.lady_id AND oa.is_active = 1
      ORDER BY l.id ASC
    `).all();
  } else {
    // Оператор видит ТОЛЬКО своих назначенных девушек
    ladies = db.prepare(query + `
      JOIN operator_assignments oa ON l.lady_id = oa.lady_id AND oa.is_active = 1
      WHERE oa.operator_id = ?
      ORDER BY l.id ASC
    `).all(operatorId);
  }

  // Подтягиваем количество отправленных Admirer Mail за сегодня для каждой девушки
  const checkAdmirer = db.prepare(`
    SELECT count(*) as count FROM admirer_mails 
    WHERE lady_id = ? AND sent_date = date('now')
  `);

  const formatted = ladies.map((lady: any) => {
    const admirerStat = checkAdmirer.get(lady.lady_id) as { count: number };
    return {
      ...lady,
      admirer_sent_today: admirerStat ? admirerStat.count : 0,
      admirer_limit: lady.daily_admirer_limit || 50
    };
  });

  res.json({ ladies: formatted });
});

// 2. Получить активные чаты назначенных девушек
operatorRouter.get('/chats', (req: AuthRequest, res) => {
  const operatorId = req.user!.id;
  const isOwner = req.user!.role === 'OWNER';

  let chats;
  if (isOwner) {
    chats = db.prepare(`
      SELECT c.*, l.name as lady_name, l.avatar_url as lady_avatar,
        (SELECT text FROM messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1) as last_message,
        (SELECT sent_at FROM messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1) as last_message_time
      FROM chats c
      JOIN ladies l ON c.lady_id = l.lady_id
      WHERE c.status = 'active'
      ORDER BY c.last_activity DESC
    `).all();
  } else {
    chats = db.prepare(`
      SELECT c.*, l.name as lady_name, l.avatar_url as lady_avatar,
        (SELECT text FROM messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1) as last_message,
        (SELECT sent_at FROM messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1) as last_message_time
      FROM chats c
      JOIN ladies l ON c.lady_id = l.lady_id
      JOIN operator_assignments oa ON l.lady_id = oa.lady_id AND oa.is_active = 1
      WHERE oa.operator_id = ? AND c.status = 'active'
      ORDER BY c.last_activity DESC
    `).all(operatorId);
  }

  res.json({ chats });
});

// 3. Получить историю сообщений конкретного чата
operatorRouter.get('/chats/:chatId/messages', (req: AuthRequest, res) => {
  const { chatId } = req.params;
  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE chat_id = ?
    ORDER BY id ASC
  `).all(chatId);

  res.json({ messages });
});

// 4. Двусторонний перевод на лету
operatorRouter.post('/translate', async (req: AuthRequest, res) => {
  const { text, targetLang, sourceLang } = req.body;
  if (!text) {
    res.json({ translated: '' });
    return;
  }

  const translated = await translateText(text, targetLang || 'en', sourceLang || 'auto');
  res.json({ translated });
});

// 5. Шаблоны для инвайтов и быстрых фраз
operatorRouter.get('/templates', (req: AuthRequest, res) => {
  const templates = db.prepare('SELECT * FROM templates ORDER BY id ASC').all();
  res.json({ templates });
});

// 6. Карточка мужчины (Мини-CRM)
operatorRouter.get('/fans/:ladyId/:manId', (req: AuthRequest, res) => {
  const { ladyId, manId } = req.params;
  let fan = db.prepare('SELECT * FROM fans_crm WHERE lady_id = ? AND man_id = ?').get(ladyId, manId);

  if (!fan) {
    fan = {
      lady_id: ladyId,
      man_id: manId,
      man_name: `Gentleman #${manId}`,
      notes: '',
      tags: '',
      spent_credits: 0,
      eligible_for_first_emf: 0
    };
  }

  res.json({ fan });
});

// 7. Обновить заметки и теги мужчины в CRM
operatorRouter.post('/fans/:ladyId/:manId', (req: AuthRequest, res) => {
  const { ladyId, manId } = req.params;
  const { notes, tags } = req.body;

  db.prepare(`
    INSERT INTO fans_crm (lady_id, man_id, man_name, notes, tags)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(lady_id, man_id) DO UPDATE SET
      notes = excluded.notes,
      tags = excluded.tags,
      updated_at = datetime('now')
  `).run(ladyId, manId, `Gentleman #${manId}`, notes || '', tags || '');

  res.json({ success: true });
});

// 8. Финансовый баланс оператора
operatorRouter.get('/balance', (req: AuthRequest, res) => {
  const operatorId = req.user!.id;
  
  // Получаем процент оператора
  const userRow = db.prepare("SELECT commission_percentage FROM users WHERE id = ?").get(operatorId) as { commission_percentage: number };
  const percent = userRow ? userRow.commission_percentage : 0;

  // Кредиты за сегодня
  const todayRow = db.prepare("SELECT sum(estimated_credits) as total FROM daily_stats WHERE operator_id = ? AND date = date('now')").get(operatorId) as { total: number };
  const todayCredits = todayRow.total || 0;

  // Кредиты за месяц
  const monthRow = db.prepare("SELECT sum(estimated_credits) as total FROM daily_stats WHERE operator_id = ? AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')").get(operatorId) as { total: number };
  const monthCredits = monthRow.total || 0;

  res.json({
    commission_percentage: percent,
    today: {
      credits: todayCredits,
      payout: (todayCredits * percent / 100).toFixed(2)
    },
    month: {
      credits: monthCredits,
      payout: (monthCredits * percent / 100).toFixed(2)
    }
  });
});

// 9. История начисления кредитов
operatorRouter.get('/balance/logs', (req: AuthRequest, res) => {
  const operatorId = req.user!.id;
  const logs = db.prepare(`
    SELECT cl.id, cl.lady_id, cl.man_id, cl.action_type, cl.credits, cl.created_at, l.name as lady_name
    FROM credit_logs cl
    LEFT JOIN ladies l ON cl.lady_id = l.lady_id
    WHERE cl.operator_id = ?
    ORDER BY cl.id DESC
    LIMIT 50
  `).all(operatorId);
  res.json({ logs });
});
