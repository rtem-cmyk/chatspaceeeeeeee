import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, AuthRequest } from '../services/auth.js';
import { decryptPassword } from '../services/crypto.js';

export const extensionRouter = Router();

extensionRouter.use(requireAuth);

/**
 * Безопасная выдача учетных данных анкеты для Chrome Extension.
 * Доступно ТОЛЬКО назначенному на смену оператору или овнеру.
 * Расширение использует эти данные для фонового входа на charmingdate.com/lady,
 * при этом сам оператор в интерфейсе пароль не видит.
 */
extensionRouter.get('/lady-credentials/:ladyId', (req: AuthRequest, res) => {
  const { ladyId } = req.params;
  const operatorId = req.user!.id;
  const isOwner = req.user!.role === 'OWNER';

  // Проверяем привязку
  if (!isOwner) {
    const assignment = db.prepare(`
      SELECT id FROM operator_assignments 
      WHERE operator_id = ? AND lady_id = ? AND is_active = 1
    `).get(operatorId, ladyId);

    if (!assignment) {
      res.status(403).json({ error: 'Анкета не назначена на вашу текущую смену' });
      return;
    }
  }

  const lady = db.prepare(`
    SELECT lady_id, name, password_encrypted, proxy_url, status
    FROM ladies WHERE lady_id = ?
  `).get(ladyId) as {
    lady_id: string;
    name: string;
    password_encrypted: string;
    proxy_url: string;
    status: string;
  } | undefined;

  if (!lady || lady.status !== 'active') {
    res.status(404).json({ error: 'Анкета не найдена или неактивна' });
    return;
  }

  const decryptedPassword = decryptPassword(lady.password_encrypted);

  res.json({
    ladyId: lady.lady_id,
    name: lady.name,
    password: decryptedPassword,
    proxyUrl: lady.proxy_url,
    loginUrl: 'http://www.charmingdate.com/lady/'
  });
});

/**
 * Получить активные настройки рассылки и шаблоны для инжектора
 */
extensionRouter.get('/automation-pack/:ladyId', (req: AuthRequest, res) => {
  const { ladyId } = req.params;
  const templates = db.prepare("SELECT * FROM templates WHERE type = 'invite'").all();
  
  res.json({
    ladyId,
    templates,
    settings: {
      inviteIntervalMinSeconds: 8,
      inviteIntervalMaxSeconds: 16,
      minAge: 25,
      maxAge: 70,
      skipRecentInvitedHours: 24
    }
  });
});
