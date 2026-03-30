import { config } from 'dotenv';
const result = config({ override: false });
if (result.error) {
  console.warn('[Env] .env file not found, relying on process.env');
} else {
  console.log(`[Env] Loaded ${Object.keys(result.parsed || {}).length} variables from .env`);
}

if (!process.env.JWT_SECRET) {
  console.warn('[Env] WARNING: JWT_SECRET is not set in process.env');
} else {
  console.log('[Env] JWT_SECRET is present');
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  API_URL: process.env.API_URL || 'http://localhost:3000',

  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_USERNAME: process.env.REDIS_USERNAME || '',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  ENCRYPTION_IV: process.env.ENCRYPTION_IV || '',

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minuto
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '2000', 10), // 2000 reqs por minuto

  BLOCK_CHECK_INTERVAL_MS: parseInt(process.env.BLOCK_CHECK_INTERVAL_MS || '900000', 10),
  CADENCE_CHECK_INTERVAL_MS: parseInt(process.env.CADENCE_CHECK_INTERVAL_MS || '900000', 10),
  PRR_CONCURRENCY: parseInt(process.env.PRR_CONCURRENCY || '5', 10),

  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@retentio.com.br',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/callback',

  // Asaas Billing
  ASAAS_API_KEY: process.env.ASAAS_API_KEY || '',
  ASAAS_BASE_URL: process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3',
} as const;
