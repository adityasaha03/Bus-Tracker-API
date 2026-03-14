import { USER_ID_PREFIX } from '../config/env';
import { randomBytes } from 'crypto';

export function generateUserId(): string {
  return `${USER_ID_PREFIX}_${randomBytes(6).toString('hex')}`;
}