import path from 'path';
import crypto from 'crypto';

// Гарантируем стабильный 32-байтный ключ шифрования AES-256
const DEFAULT_KEY = 'chatspace_charmdate_master_key_2026_super_secure!';
const rawKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
export const ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  WS_PORT: process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 4001,
  JWT_SECRET: process.env.JWT_SECRET || 'charmdate_chatspace_jwt_secret_xyz789',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../../chatspace.db'),
  TRANSLATOR_DEEPL_KEY: process.env.DEEPL_API_KEY || '',
  DAILY_ADMIRER_LIMIT: 50,
  FIRST_EMF_MIN_HOURS: 6,
};
