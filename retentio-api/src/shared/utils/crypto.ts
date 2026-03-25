import * as crypto from 'crypto';
import { env } from '../../config/env';

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(env.ENCRYPTION_KEY?.padEnd(32, '0').substring(0, 32) || '12345678901234567890123456789012', 'utf-8');
const IV = Buffer.from(env.ENCRYPTION_IV?.padEnd(16, '0').substring(0, 16) || '1234567890123456', 'utf-8');

export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
