import { REGISTRATION_LIMIT_WINDOW_MS, REGISTRATION_LIMIT_MAX, INGEST_LIMIT_WINDOW_MS, INGEST_LIMIT_MAX } from '../config/env';

const store = new Map<string, number[]>();

function isLimited(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const timestamps = (store.get(key) || []).filter(t => now - t < windowMs);
  timestamps.push(now);
  store.set(key, timestamps);
  return timestamps.length > max;
}

export function registrationLimited(ip: string): boolean {
  return isLimited(`reg:${ip}`, REGISTRATION_LIMIT_WINDOW_MS, REGISTRATION_LIMIT_MAX);
}

export function ingestLimited(busId: string): boolean {
  return isLimited(`ingest:${busId}`, INGEST_LIMIT_WINDOW_MS, INGEST_LIMIT_MAX);
}