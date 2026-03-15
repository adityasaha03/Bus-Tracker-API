import crypto from 'crypto';
import { BUS_ID_PREFIX } from '../config/env';

export function generateBusId(): string {
  // Generates a 12-character random hex string appended to the prefix
  const randomBytes = crypto.randomBytes(6).toString('hex');
  return `${BUS_ID_PREFIX}_${randomBytes}`;
}
