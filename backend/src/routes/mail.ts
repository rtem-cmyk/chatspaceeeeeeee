import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, AuthRequest } from '../services/auth.js';
import { CONFIG } from '../config.js';

export const mailRouter = Router();

mailRouter.use(requireAuth);

// 1. Статус лимитов Admirer Mail за сегодня
mailRouter.get('/admirer/status/:ladyId', (req: AuthRequest, res) => {
  const { ladyId } = req.params;

  const row = db.prepare(`
    SELECT count(*) as count 
    FROM admirer_mails 
    WHERE lady_id = ? AND sent_date = date('now')
  `).get(ladyId) as { count: number };

  const lady = db.prepare('SELECT daily_admirer_limit FROM ladies WHERE lady_id = ?').get(ladyId) as { daily_admirer_limit: number } | undefined;
  const limit = lady?.daily_admirer_limit || CONFIG.DAILY_ADMIRER_LIMIT;
  const sent = row ? row.count : 0;
  const remaining = Math.max(0, limit - sent);

  res.json({
    ladyId,
    sentToday: sent,
    limit,
    remaining,
    isLimitReached: sent >= limit
  });
});

// 2. Логирование отправленного письма Admirer Mail (вызывается расширением или оператором)
mailRouter.post('/admirer/record', (req: AuthRequest, res) => {
  const { ladyId, manId, category, templateTitle, content } = req.body;

  if (!ladyId || !manId) {
    res.status(400).json({ error: 'Не указана анкета или ID мужчины' });
    return;
  }

  // Проверяем лимит на сегодня
  const countRow = db.prepare(`
    SELECT count(*) as count 
    FROM admirer_mails 
    WHERE lady_id = ? AND sent_date = date('now')
  `).get(ladyId) as { count: number };

  if (countRow.count >= CONFIG.DAILY_ADMIRER_LIMIT) {
    res.status(429).json({ error: `Достигнут суточный лимит CharmDate (${CONFIG.DAILY_ADMIRER_LIMIT} писем/сутки)` });
    return;
  }

  db.prepare(`
    INSERT INTO admirer_mails (lady_id, man_id, category, template_title, content, status)
    VALUES (?, ?, ?, ?, ?, 'sent')
  `).run(ladyId, manId, category || 'A', templateTitle || 'Admirer Mail', content || '');

  // Обновляем статистику
  db.prepare(`
    INSERT INTO daily_stats (date, lady_id, operator_id, admirer_sent)
    VALUES (date('now'), ?, ?, 1)
    ON CONFLICT(date, lady_id, operator_id) DO UPDATE SET
      admirer_sent = admirer_sent + 1
  `).run(ladyId, req.user!.id);

  res.json({ success: true, remaining: CONFIG.DAILY_ADMIRER_LIMIT - (countRow.count + 1) });
});

// 3. Список кандидатов для First EMF (мужчины, с которыми был чат, и соблюдается интервал 6 часов)
mailRouter.get('/first-emf/candidates/:ladyId', (req: AuthRequest, res) => {
  const { ladyId } = req.params;

  // Ищем мужчин, у которых был чат, и либо First EMF еще не отправлялся, либо прошло > 6 часов
  const candidates = db.prepare(`
    SELECT 
      f.man_id, f.man_name, f.last_chat_date, f.first_emf_sent_count, f.last_first_emf_time,
      ROUND((julianday('now') - julianday(COALESCE(f.last_first_emf_time, '2000-01-01'))) * 24, 1) as hours_since_last_emf
    FROM fans_crm f
    WHERE f.lady_id = ? 
      AND f.eligible_for_first_emf = 1
      AND f.first_emf_sent_count < 5
      AND (f.last_first_emf_time IS NULL OR (julianday('now') - julianday(f.last_first_emf_time)) * 24 >= ?)
    ORDER BY f.last_chat_date DESC
  `).all(ladyId, CONFIG.FIRST_EMF_MIN_HOURS);

  res.json({ candidates });
});

// 4. Запись отправки First EMF
mailRouter.post('/first-emf/send', (req: AuthRequest, res) => {
  const { ladyId, manId } = req.body;

  db.prepare(`
    UPDATE fans_crm
    SET 
      first_emf_sent_count = first_emf_sent_count + 1,
      last_first_emf_time = datetime('now')
    WHERE lady_id = ? AND man_id = ?
  `).run(ladyId, manId);

  res.json({ success: true, message: 'First EMF успешно зарегистрирован' });
});

// 5. Получить список входящих писем
mailRouter.get('/inbox/:ladyId', (req: AuthRequest, res) => {
  const { ladyId } = req.params;
  const mails = db.prepare(`
    SELECT * FROM incoming_mails
    WHERE lady_id = ?
    ORDER BY received_at DESC
  `).all(ladyId);
  res.json({ mails });
});

// 6. Получить конкретное письмо
mailRouter.get('/inbox/mail/:id', (req: AuthRequest, res) => {
  const { id } = req.params;
  const mail = db.prepare('SELECT * FROM incoming_mails WHERE id = ?').get(id);
  
  if (mail) {
    db.prepare('UPDATE incoming_mails SET is_read = 1 WHERE id = ?').run(id);
    res.json({ mail });
  } else {
    res.status(404).json({ error: 'Письмо не найдено' });
  }
});

// 7. Отправить ответ на письмо (команда расширению)
mailRouter.post('/reply', (req: AuthRequest, res) => {
  const { ladyId, manId, mailId, text, photoUrl } = req.body;
  // Мы просто отправляем команду расширению, фактическая отправка будет там
  import('../websocket/server.js').then(({ broadcastToExtension }) => {
    broadcastToExtension({
      event: 'EXECUTE_SEND_MAIL_REPLY',
      payload: { ladyId, manId, mailId, textToSend: text, photoUrl }
    });
  });

  db.prepare(`
    INSERT INTO credit_logs (operator_id, lady_id, man_id, action_type, credits)
    VALUES (?, ?, ?, 'mail_reply', 1.0)
  `).run(req.user!.id, ladyId, manId);

  db.prepare(`
    INSERT INTO daily_stats (date, lady_id, operator_id, estimated_credits)
    VALUES (date('now'), ?, ?, 1.0)
    ON CONFLICT(date, lady_id, operator_id) DO UPDATE SET
      estimated_credits = estimated_credits + 1.0
  `).run(ladyId, req.user!.id);

  res.json({ success: true, message: 'Команда ответа отправлена расширению' });
});
