import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const url = new URL(env.REDIS_URL);

const redisOptions: IORedis.RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

if (url.password) redisOptions.password = url.password;
else if (env.REDIS_PASSWORD) redisOptions.password = env.REDIS_PASSWORD;

if (url.username) redisOptions.username = url.username;
else if (env.REDIS_USERNAME) redisOptions.username = env.REDIS_USERNAME;

export const redis = new IORedis(env.REDIS_URL, redisOptions);

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', err));
