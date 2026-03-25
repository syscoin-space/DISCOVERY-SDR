import { prisma } from '../../config/prisma';
import { decrypt } from '../../shared/utils/crypto';
import { AppError } from '../../shared/types';
import { EmailProvider, SendEmailOptions } from './email.interface';
import { ResendAdapter } from './adapters/resend.adapter';
import { EmailProviderType } from '@prisma/client';
import { logger } from '../../config/logger';

export class EmailService {
  /**
   * Resolve o provider do tenant e envia o e-mail
   */
  async send(tenantId: string, options: SendEmailOptions) {
    const config = await prisma.tenantEmailProvider.findFirst({
      where: { tenant_id: tenantId, is_enabled: true }
    });

    if (!config || !config.api_key_encrypted) {
      logger.warn(`[EmailService] Tenant ${tenantId} has no enabled email provider. Skipping.`);
      return null;
    }

    try {
      const apiKey = decrypt(config.api_key_encrypted);
      const provider = this.getProvider(config.provider, apiKey);

      // Merge config defaults with options
      const finalOptions: SendEmailOptions = {
        ...options,
        from: options.from || {
          name: config.sender_name || undefined,
          email: config.sender_email || 'no-reply@discoverysdr.com.br'
        },
        reply_to: options.reply_to || config.reply_to || undefined
      };

      const result = await provider.send(finalOptions);

      return {
        id: result.id,
        provider: config.provider,
        sender: finalOptions.from?.email || config.sender_email
      };
    } catch (error: any) {
      logger.error(`[EmailService] Failed to send email for tenant ${tenantId}`, { error: error.message });
      throw new AppError(500, `Erro ao enviar e-mail: ${error.message}`);
    }
  }

  /**
   * Testa a configuração de um provider antes de salvar
   */
  async testConnection(providerType: EmailProviderType, apiKey: string) {
    const provider = this.getProvider(providerType, apiKey);
    return await provider.validateConfig();
  }

  private getProvider(type: EmailProviderType, apiKey: string): EmailProvider {
    switch (type) {
      case EmailProviderType.RESEND:
        return new ResendAdapter(apiKey);
      default:
        throw new Error(`Provider ${type} not supported yet`);
    }
  }
}

export const emailService = new EmailService();
