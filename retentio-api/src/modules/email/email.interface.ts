export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: {
    name?: string;
    email: string;
  };
  reply_to?: string;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<{ id: string }>;
  validateConfig(): Promise<boolean>;
}
