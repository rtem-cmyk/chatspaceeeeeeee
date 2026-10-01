import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config.js';

export interface UserPayload {
  id: number;
  username: string;
  role: 'OWNER' | 'OPERATOR';
  fullName?: string;
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, CONFIG.JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Требуется авторизация (отсутствует токен)' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Недействительный или просроченный токен' });
    return;
  }

  req.user = payload;
  next();
}

export function requireOwner(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'OWNER') {
      res.status(403).json({ error: 'Доступ запрещён: требуется роль Владельца (OWNER)' });
      return;
    }
    next();
  });
}
