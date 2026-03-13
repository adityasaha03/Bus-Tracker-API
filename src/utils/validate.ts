import type { ValidationResult } from '../types/index';

export function validateUserReg(body: unknown): ValidationResult {
  return { valid: true };
}

export function validateLogin(body: unknown): ValidationResult {
  return { valid: true };
}

export function validateBusReg(body: unknown): ValidationResult {
  return { valid: true };
}

export function validateReading(body: unknown): ValidationResult {
  return { valid: true };
}
