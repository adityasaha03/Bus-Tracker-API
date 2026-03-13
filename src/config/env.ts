const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'] as const;

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

export const PORT = Number(process.env.PORT) || 3000;
export const DATABASE_URL = process.env.DATABASE_URL as string;
export const REDIS_URL = process.env.REDIS_URL as string;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const API_KEY_PREFIX = process.env.API_KEY_PREFIX || 'wbx_sk';
export const BUS_ID_PREFIX = process.env.BUS_ID_PREFIX || 'wbx_bus';
export const USER_ID_PREFIX = process.env.USER_ID_PREFIX || 'wbx_user';
export const REGISTRATION_LIMIT_WINDOW_MS = Number(process.env.REGISTRATION_LIMIT_WINDOW_MS) || 60000;
export const REGISTRATION_LIMIT_MAX = Number(process.env.REGISTRATION_LIMIT_MAX) || 5;
export const INGEST_LIMIT_WINDOW_MS = Number(process.env.INGEST_LIMIT_WINDOW_MS) || 10000;
export const INGEST_LIMIT_MAX = Number(process.env.INGEST_LIMIT_MAX) || 30;
export const REDIS_LATEST_TTL_SECONDS = process.env.REDIS_LATEST_TTL_SECONDS
  ? Number(process.env.REDIS_LATEST_TTL_SECONDS)
  : null;