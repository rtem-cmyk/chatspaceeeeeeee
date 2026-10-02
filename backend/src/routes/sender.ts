import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, AuthRequest } from '../services/auth.js';
import { broadcastToExtension } from '../websocket/server.js';

export const senderRouter = Router();
senderRouter.use(requireAuth);

// Получить список всех запущенных задач (массовых)
senderRouter.get('/tasks', (req: AuthRequest, res) => {
  const operatorId = req.user!.id;
  // Join to get lady names
  const tasks = db.prepare(`
    SELECT st.*, l.name as lady_name 
    FROM sender_tasks st
    JOIN ladies l ON l.lady_id = st.lady_id
    JOIN operator_assignments oa ON l.lady_id = oa.lady_id AND oa.is_active = 1
    WHERE oa.operator_id = ?
    ORDER BY st.id DESC
  `).all(operatorId);
  res.json({ tasks });
});

// Запустить массовую кампанию
senderRouter.post('/mass', (req: AuthRequest, res) => {
  const { lady_ids, target_audience, template_text, speed_ms } = req.body;
  const operatorId = req.user!.id;

  if (!lady_ids || !Array.isArray(lady_ids)) {
    return res.status(400).json({ error: 'Необходим массив lady_ids' });
  }

  db.exec('BEGIN');
  try {
    const stmt = db.prepare(`
      INSERT INTO sender_tasks (lady_id, target_audience, template_text, speed_ms, status)
      VALUES (?, ?, ?, ?, 'running')
    `);

    lady_ids.forEach(ladyId => {
      stmt.run(ladyId, target_audience || 'online', template_text, speed_ms || 5000);
      
      broadcastToExtension(ladyId, {
        event: 'START_SENDER',
        payload: {
          ladyId,
          targetAudience: target_audience || 'online',
          templateText: template_text,
          speedMs: speed_ms || 5000
        }
      });
    });
    db.exec('COMMIT');
    res.json({ success: true });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Управление задачей (Play/Pause/Stop)
senderRouter.put('/tasks/:id/status', (req: AuthRequest, res) => {
  const { status } = req.body; // 'running' | 'paused' | 'stopped'
  const id = req.params.id;

  const task = db.prepare('SELECT lady_id FROM sender_tasks WHERE id = ?').get(id) as { lady_id: string } | undefined;
  if (!task) return res.status(404).json({ error: 'Задача не найдена' });

  db.prepare('UPDATE sender_tasks SET status = ? WHERE id = ?').run(status, id);

  broadcastToExtension(task.lady_id, {
    event: status === 'running' ? 'START_SENDER' : 'STOP_SENDER',
    payload: { campaignId: id, ladyId: task.lady_id }
  });

  res.json({ success: true, status });
});
