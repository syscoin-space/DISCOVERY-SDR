import { config } from 'dotenv';
config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  API_URL: process.env.API_URL || 'http://localhost:3000',

  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  ENCRYPTION_IV: process.env.ENCRYPTION_IV || '',

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  BLOCK_CHECK_INTERVAL_MS: parseInt(process.env.BLOCK_CHECK_INTERVAL_MS || '900000', 10),
  CADENCE_CHECK_INTERVAL_MS: parseInt(process.env.CADENCE_CHECK_INTERVAL_MS || '900000', 10),
  PRR_CONCURRENCY: parseInt(process.env.PRR_CONCURRENCY || '5', 10),
} as const;
