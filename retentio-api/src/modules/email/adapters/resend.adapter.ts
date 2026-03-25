import { Resend } from 'resend';
import { EmailProvider, SendEmailOptions } from '../email.interface';
import { logger } from '../../../config/logger';

export class ResendAdapter implements EmailProvider {
  private client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(options: SendEmailOptions): Promise<{ id: string }> {
    try {
      const response = await this.client.emails.send({
        from: options.from 
          ? `${options.from.name || ''} <${options.from.email}>`.trim()
          : 'Discovery SDR <no-reply@discoverysdr.com.br>', // Fallback global se necessário
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.reply_to,
      });

      if (response.error) {
        throw new Error(`Resend Error: ${response.error.message}`);
      }

      return { id: response.data?.id || '' };
    } catch (error: any) {
      logger.error('[ResendAdapter] Failed to send email', { error: error.message });
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Pequeno hack para validar a chave sem enviar e-mail real
      // Listar domínios ou algo simples
      await this.client.domains.list();
      return true;
    } catch (error) {
      return false;
    }
  }
}
