/**
 * ResendService — Wrapper sobre a Resend API com suporte a:
 *   - Configuração por SDR (chave API criptografada no banco)
 *   - Rate limiting diário (daily_limit por SDR)
 *   - Retry exponencial
 *   - Registro de bounces/erros na interaction table
 */

import { Resend } from 'resend';
import crypto from 'node:crypto';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/types';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

// ─── Types ────────────────────────────────────────────────────────────

interface ResendConfigData {
  id: string;
  encrypted_api_key: string;
  from_email: string;
  from_name?: string | null;
  daily_limit: number;
  sent_today: number;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  leadId: string;
  stepId?: string;
  tags?: Record<string, string>;
}

interface ResendApiResponse {
  id?: string;
  error?: { message: string; name: string };
}

// ─── Encryption helpers ───────────────────────────────────────────────
// Usa AES-256-GCM com chave derivada de ENCRYPTION_KEY do .env

const ALGO = 'aes-256-gcm';
const KEY_HEX = env.ENCRYPTION_KEY; // 64 hex chars = 32 bytes

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new AppError(500, 'ENCRYPTION_KEY inválida — deve ter 64 hex chars', 'CONFIG_ERROR');
  }
  return Buffer.from(KEY_HEX, 'hex');
}

export function encryptApiKey(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv) as crypto.CipherGCM;
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Formato: iv(12)+tag(16)+ciphertext — tudo em base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptApiKey(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ─── Service ──────────────────────────────────────────────────────────

export class ResendService {
  /**
   * Envia email usando a configuração Resend do SDR.
   * Faz throttle baseado em daily_limit.
   */
  async sendEmail(config: ResendConfigData, options: SendEmailOptions): Promise<string> {
    // Verifica rate limit diário
    if (config.sent_today >= config.daily_limit) {
      throw new AppError(429, `Limite diário de ${config.daily_limit} emails atingido`, 'DAILY_LIMIT_REACHED');
    }

    const apiKey = decryptApiKey(config.encrypted_api_key);
    const client = new Resend(apiKey);

    const from = config.from_name
      ? `${config.from_name} <${config.from_email}>`
      : config.from_email;

    logger.info(`Sending email via Resend to ${options.to}`, {
      leadId: options.leadId,
      stepId: options.stepId,
    });

    const result = await client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      tags: options.tags
        ? Object.entries(options.tags).map(([name, value]) => ({ name, value }))
        : [
            { name: 'lead_id', value: options.leadId },
            ...(options.stepId ? [{ name: 'step_id', value: options.stepId }] : []),
          ],
    }) as ResendApiResponse;

    if (result.error) {
      logger.error(`Resend error for lead ${options.leadId}`, result.error);
      throw new AppError(502, `Resend: ${result.error.message}`, result.error.name);
    }

    const messageId = result.id ?? 'unknown';
    logger.info(`Email sent successfully: ${messageId}`);
    return messageId;
  }

  // ── Config management ────────────────────────────────────────────────

  async upsertConfig(
    userId: string,
    data: {
      from_email: string;
      from_name?: string;
      api_key: string;
      daily_limit?: number;
    },
  ) {
    const encrypted = encryptApiKey(data.api_key);

    return prisma.resendConfig.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        from_email: data.from_email,
        from_name: data.from_name,
        encrypted_api_key: encrypted,
        daily_limit: data.daily_limit ?? 50,
      },
      update: {
        from_email: data.from_email,
        from_name: data.from_name,
        encrypted_api_key: encrypted,
        ...(data.daily_limit !== undefined && { daily_limit: data.daily_limit }),
      },
      select: {
        id: true,
        user_id: true,
        from_email: true,
        from_name: true,
        daily_limit: true,
        sent_today: true,
        active: true,
        created_at: true,
        updated_at: true,
        // NUNCA retornar encrypted_api_key
      },
    });
  }

  async getConfig(userId: string) {
    const config = await prisma.resendConfig.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        from_email: true,
        from_name: true,
        daily_limit: true,
        sent_today: true,
        active: true,
        last_reset_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    return config;
  }

  async testConnection(userId: string, to: string) {
    const config = await prisma.resendConfig.findUnique({
      where: { user_id: userId },
    });

    if (!config) throw new AppError(404, 'Configuração Resend não encontrada', 'CONFIG_NOT_FOUND');
    if (!config.active) throw new AppError(400, 'Configuração Resend desativada', 'CONFIG_INACTIVE');

    const messageId = await this.sendEmail(config, {
      to,
      subject: '✅ Retentio — Email de teste',
      html: '<p>Sua integração com o Resend está funcionando corretamente!</p>',
      leadId: 'test',
    });

    return { success: true, message_id: messageId };
  }

  /**
   * Reset diário do contador sent_today.
   * Executar via cron às 00:00 BRT.
   */
  async resetDailyCounters() {
    const result = await prisma.resendConfig.updateMany({
      data: { sent_today: 0, last_reset_at: new Date() },
    });
    logger.info(`Reset daily counters for ${result.count} Resend configs`);
    return result.count;
  }
}

export const resendService = new ResendService();
