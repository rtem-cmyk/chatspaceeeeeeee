import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { generateToken, requireAuth, AuthRequest } from '../services/auth.js';

export const authRouter = Router();

// Авторизация пользователя (Овнер или Оператор)
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Укажите имя пользователя и пароль' });
    return;
  }

  const user = db.prepare(`
    SELECT id, username, password_hash, role, full_name
    FROM users WHERE username = ?
  `).get(username) as {
    id: number;
    username: string;
    password_hash: string;
    role: 'OWNER' | 'OPERATOR';
    full_name: string;
  } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
    return;
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name
    }
  });
});

// Проверка текущей сессии
authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});
