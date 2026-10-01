import crypto from 'crypto';
import { ENCRYPTION_KEY } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Зашифровывает пароль анкеты перед сохранением в базу данных.
 * Использует алгоритм AES-256-GCM с контролем целостности (authTag).
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Формат: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Расшифровывает пароль анкеты для отправки авторизованному расширению в браузере.
 */
export function decryptPassword(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Некорректный формат зашифрованных данных');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Ошибка расшифровки пароля:', err);
    return '';
  }
}
