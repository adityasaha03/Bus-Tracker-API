import Redis from 'ioredis';
import { REDIS_URL } from './env.ts';

export const redis = new Redis(REDIS_URL, {
  tls: {},
  connectTimeout: 10000,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err: Error) => console.error('Redis error:', err.message));