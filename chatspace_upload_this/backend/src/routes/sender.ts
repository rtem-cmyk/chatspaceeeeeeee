import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, AuthRequest } from '../services/auth.js';
import { broadcastToExtension } from '../websocket/server.js';

export const senderRouter = Router();
senderRouter.use(requireAuth);

// Получить список кампаний для анкеты
senderRouter.get('/:ladyId', (req: AuthRequest, res) => {
  const campaigns = db.prepare('SELECT * FROM sender_campaigns WHERE lady_id = ? ORDER BY id DESC').all(req.params.ladyId);
  res.json({ campaigns });
});

// Создать новую кампанию
senderRouter.post('/', (req: AuthRequest, res) => {
  const { ladyId, targetAudience, templateText } = req.body;
  const operatorId = req.user!.id;

  const result = db.prepare(`
    INSERT INTO sender_campaigns (lady_id, operator_id, target_audience, template_text, status)
    VALUES (?, ?, ?, ?, 'stopped')
  `).run(ladyId, operatorId, targetAudience || 'online', templateText);

  res.json({ success: true, id: result.lastInsertRowid });
});

// Запустить / Остановить кампанию
senderRouter.put('/:id/status', (req: AuthRequest, res) => {
  const { status, ladyId } = req.body; // 'running' | 'stopped'
  const id = req.params.id;

  db.prepare('UPDATE sender_campaigns SET status = ? WHERE id = ?').run(status, id);

  // Оповещаем расширение (чтобы оно начало или прекратило парсинг и отправку)
  broadcastToExtension(ladyId, {
    event: status === 'running' ? 'START_SENDER' : 'STOP_SENDER',
    payload: {
      campaignId: id,
      ladyId,
      targetAudience: db.prepare('SELECT target_audience FROM sender_campaigns WHERE id = ?').get(id),
      templateText: db.prepare('SELECT template_text FROM sender_campaigns WHERE id = ?').get(id)
    }
  });

  res.json({ success: true, status });
});

// Обновить счетчик отправленных
senderRouter.post('/:id/increment', (req: AuthRequest, res) => {
  db.prepare('UPDATE sender_campaigns SET sent_count = sent_count + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
