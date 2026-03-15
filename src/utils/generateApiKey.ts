import crypto from 'crypto';
import { API_KEY_PREFIX } from '../config/env';

export function generateApiKey(): string {
  // Generates a 32-byte (64 char hex) cryptographically secure API key
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${API_KEY_PREFIX}_${randomBytes}`;
}
