import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { requireOwner } from '../services/auth.js';
import { encryptPassword } from '../services/crypto.js';

export const adminRouter = Router();

// Все эндпоинты админки требуют роли OWNER
adminRouter.use(requireOwner);

// 1. Получить список всех анкет девушек
adminRouter.get('/ladies', (req, res) => {
  const ladies = db.prepare(`
    SELECT 
      l.id, l.lady_id, l.name, l.proxy_url, l.status, l.online_status, 
      l.daily_admirer_limit, l.avatar_url, l.created_at,
      u.full_name as assigned_operator_name,
      u.id as assigned_operator_id,
      oa.id as assignment_id,
      oa.shift_start, oa.shift_end
    FROM ladies l
    LEFT JOIN operator_assignments oa ON l.lady_id = oa.lady_id AND oa.is_active = 1
    LEFT JOIN users u ON oa.operator_id = u.id
    ORDER BY l.id DESC
  `).all();

  res.json({ ladies });
});

// 2. Добавить новую анкету девушки
adminRouter.post('/ladies', (req, res) => {
  const { lady_id, name, password, proxy_url, avatar_url } = req.body;

  if (!lady_id || !name || !password) {
    res.status(400).json({ error: 'ID девушки, имя и пароль обязательны' });
    return;
  }

  try {
    const encrypted = encryptPassword(password);
    const insert = db.prepare(`
      INSERT INTO ladies (lady_id, name, password_encrypted, proxy_url, avatar_url)
      VALUES (?, ?, ?, ?, ?)
    `);

    insert.run(
      lady_id.trim().toUpperCase(),
      name.trim(),
      encrypted,
      proxy_url ? proxy_url.trim() : '',
      avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    );

    res.status(201).json({ success: true, message: `Анкета ${lady_id} успешно добавлена` });
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Анкета с таким ID уже существует в системе' });
      return;
    }
    res.status(500).json({ error: 'Ошибка сохранения анкеты: ' + err.message });
  }
});

// 3. Обновить анкету
adminRouter.put('/ladies/:id', (req, res) => {
  const { id } = req.params;
  const { name, password, proxy_url, status, avatar_url } = req.body;

  try {
    if (password) {
      const encrypted = encryptPassword(password);
      db.prepare(`
        UPDATE ladies 
        SET name = ?, password_encrypted = ?, proxy_url = ?, status = ?, avatar_url = ?
        WHERE id = ?
      `).run(name, encrypted, proxy_url || '', status || 'active', avatar_url, id);
    } else {
      db.prepare(`
        UPDATE ladies 
        SET name = ?, proxy_url = ?, status = ?, avatar_url = ?
        WHERE id = ?
      `).run(name, proxy_url || '', status || 'active', avatar_url, id);
    }

    res.json({ success: true, message: 'Анкета успешно обновлена' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Удалить анкету
adminRouter.delete('/ladies/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM ladies WHERE id = ?').run(id);
  res.json({ success: true });
});

// 5. Список операторов
adminRouter.get('/operators', (req, res) => {
  const operators = db.prepare(`
    SELECT id, username, role, full_name, commission_percentage, created_at, permissions, password_plain
    FROM users WHERE role = 'OPERATOR'
    ORDER BY id DESC
  `).all();
  res.json({ operators });
});

// 6. Создать нового оператора
adminRouter.post('/operators', (req, res) => {
  const { username, password, full_name, commission_percentage, permissions } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Логин и пароль обязательны' });
    return;
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const perms = permissions ? JSON.stringify(permissions) : '{"chat":true,"sender":true,"gallery":true}';
    db.prepare(`
      INSERT INTO users (username, password_hash, role, full_name, commission_percentage, permissions, password_plain)
      VALUES (?, ?, 'OPERATOR', ?, ?, ?, ?)
    `).run(username.trim().toLowerCase(), hash, full_name || username, commission_percentage || 40, perms, password);

    res.status(201).json({ success: true, message: 'Оператор успешно создан' });
  } catch (err: any) {
    res.status(400).json({ error: 'Оператор с таким логином уже есть' });
  }
});

// 7. Удалить оператора
adminRouter.delete('/operators/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});

// 8. Назначить анкеты на оператора
adminRouter.post('/assignments', (req, res) => {
  const { operator_id, lady_ids, shift_start, shift_end } = req.body;
  if (!operator_id || !lady_ids || !Array.isArray(lady_ids) || lady_ids.length === 0) {
    res.status(400).json({ error: 'Укажите оператора и выберите хотя бы одну анкету' });
    return;
  }

  const insert = db.prepare(`
    INSERT INTO operator_assignments (operator_id, lady_id, shift_start, shift_end, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  try {
    db.exec('BEGIN TRANSACTION');
    for (const lady_id of lady_ids) {
      insert.run(operator_id, lady_id, shift_start || '08:00', shift_end || '20:00');
    }
    db.exec('COMMIT');
    res.json({ success: true, message: `Успешно назначено анкет: ${lady_ids.length}` });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Ошибка назначения: ' + err.message });
  }
});

// 9. Снять привязку анкеты
adminRouter.delete('/assignments/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM operator_assignments WHERE id = ?').run(id);
  res.json({ success: true });
});

// 10. Общая аналитика агентства
adminRouter.get('/stats', (req, res) => {
  const totalLadies = db.prepare('SELECT count(*) as count FROM ladies').get() as { count: number };
  const totalOperators = db.prepare("SELECT count(*) as count FROM users WHERE role = 'OPERATOR'").get() as { count: number };
  const activeChats = db.prepare("SELECT count(*) as count FROM chats WHERE status = 'active'").get() as { count: number };
  const totalInvitesToday = db.prepare("SELECT count(*) as count FROM invites_log WHERE date(sent_at) = date('now')").get() as { count: number };
  const totalAdmirersToday = db.prepare("SELECT count(*) as count FROM admirer_mails WHERE sent_date = date('now')").get() as { count: number };

  const liveChats = db.prepare(`
    SELECT c.id, c.lady_id, l.name as lady_name, c.man_id, c.man_name, c.man_country, c.last_activity
    FROM chats c
    JOIN ladies l ON c.lady_id = l.lady_id
    WHERE c.status = 'active'
    ORDER BY c.last_activity DESC
    LIMIT 10
  `).all();

  res.json({
    totalLadies: totalLadies.count,
    totalOperators: totalOperators.count,
    activeChats: activeChats.count,
    invitesToday: totalInvitesToday.count,
    admirerToday: totalAdmirersToday.count,
    liveChats
  });
});

// 11. Финансовая статистика
adminRouter.get('/finance-stats', (req, res) => {
  // Общая сумма кредитов за сегодня и месяц
  const todayTotal = db.prepare("SELECT sum(estimated_credits) as total FROM daily_stats WHERE date = date('now')").get() as { total: number };
  const monthTotal = db.prepare("SELECT sum(estimated_credits) as total FROM daily_stats WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')").get() as { total: number };

  // Доход по анкетам (за месяц)
  const byLady = db.prepare(`
    SELECT ds.lady_id, l.name, sum(ds.estimated_credits) as total_credits
    FROM daily_stats ds
    JOIN ladies l ON ds.lady_id = l.lady_id
    WHERE strftime('%Y-%m', ds.date) = strftime('%Y-%m', 'now')
    GROUP BY ds.lady_id
    ORDER BY total_credits DESC
  `).all();

  // Доход по операторам (за месяц) и расчет выплаты
  const byOperator = db.prepare(`
    SELECT 
      u.id, 
      u.full_name, 
      u.commission_percentage,
      sum(ds.estimated_credits) as total_credits_earned
    FROM daily_stats ds
    JOIN users u ON ds.operator_id = u.id
    WHERE strftime('%Y-%m', ds.date) = strftime('%Y-%m', 'now')
    GROUP BY ds.operator_id
    ORDER BY total_credits_earned DESC
  `).all();

  const operatorsFin = byOperator.map((op: any) => ({
    ...op,
    payout_credits: op.total_credits_earned ? (op.total_credits_earned * op.commission_percentage / 100).toFixed(2) : 0
  }));

  res.json({
    todayTotal: todayTotal.total || 0,
    monthTotal: monthTotal.total || 0,
    byLady,
    byOperator: operatorsFin
  });
});

// 12. Редактировать оператора
adminRouter.put('/operators/:id', (req, res) => {
  const { id } = req.params;
  const { full_name, commission_percentage } = req.body;
  try {
    db.prepare(`
      UPDATE users 
      SET full_name = ?, commission_percentage = ?
      WHERE id = ? AND role = 'OPERATOR'
    `).run(full_name, commission_percentage || 40, id);
    res.json({ success: true, message: 'Оператор обновлен' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Статус смены операторов
adminRouter.get('/shift-status', (req, res) => {
  try {
    const operators = db.prepare(`
      SELECT id, username, full_name
      FROM users WHERE role = 'OPERATOR'
    `).all();

    const statusList = operators.map((op: any) => {
      const activeChats = db.prepare(`
        SELECT c.id, c.lady_id,
          (SELECT sender_type FROM messages m WHERE m.chat_id = c.id ORDER BY m.sent_at DESC LIMIT 1) as last_sender_type,
          (SELECT sent_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.sent_at DESC LIMIT 1) as last_msg_time
        FROM chats c
        JOIN operator_assignments oa ON c.lady_id = oa.lady_id
        WHERE oa.operator_id = ? AND oa.is_active = 1 AND c.status = 'active'
      `).all(op.id);

      let maxWaitSec = 0;
      for (const c of activeChats) {
        if (c.last_sender_type === 'man' && c.last_msg_time) {
          const diff = Math.floor((Date.now() - new Date(c.last_msg_time).getTime()) / 1000);
          if (diff > maxWaitSec) {
            maxWaitSec = diff;
          }
        }
      }

      return {
        id: op.id,
        username: op.username,
        full_name: op.full_name,
        active_chats: activeChats.length,
        max_wait_time_sec: maxWaitSec
      };
    });

    res.json({ statusList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Обновить права оператора
adminRouter.put('/operators/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  try {
    const permsStr = typeof permissions === 'object' ? JSON.stringify(permissions) : String(permissions);
    db.exec('BEGIN TRANSACTION');
    db.prepare(`
      UPDATE users 
      SET permissions = ?
      WHERE id = ? AND role = 'OPERATOR'
    `).run(permsStr, id);
    db.exec('COMMIT');
    res.json({ success: true, message: 'Права оператора успешно обновлены' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Получить последние логи заработка
adminRouter.get('/balance/logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT cl.id, cl.action_type, cl.credits, cl.created_at, l.name as lady_name
      FROM credit_logs cl
      LEFT JOIN ladies l ON cl.lady_id = l.lady_id
      ORDER BY cl.created_at DESC
      LIMIT 100
    `).all();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при получении логов баланса' });
  }
});
