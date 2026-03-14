import type { ValidationResult } from '../types/index';

export function validateUserReg(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>;

  if (!b.name || typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 100)
    return { valid: false, message: 'name must be between 2 and 100 characters' };

  if (!b.austId || typeof b.austId !== 'string' || b.austId.trim().length === 0)
    return { valid: false, message: 'austId is required' };

  if (!b.email || typeof b.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))
    return { valid: false, message: 'valid email is required' };

  if (!b.password || typeof b.password !== 'string' || b.password.length < 8)
    return { valid: false, message: 'password must be at least 8 characters' };

  if (!b.phone || typeof b.phone !== 'string' || b.phone.trim().length === 0)
    return { valid: false, message: 'phone is required' };

  if (!b.role || !['SUPER_ADMIN', 'COORDINATOR', 'GENERAL'].includes(b.role as string))
    return { valid: false, message: 'role must be SUPER_ADMIN, COORDINATOR, or GENERAL' };

  return { valid: true };
}

export function validateLogin(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>;

  if (!b.email || typeof b.email !== 'string' || b.email.trim().length === 0)
    return { valid: false, message: 'email is required' };

  if (!b.password || typeof b.password !== 'string' || b.password.length === 0)
    return { valid: false, message: 'password is required' };

  return { valid: true };
}

export function validateBusReg(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>;

  if (!b.busName || typeof b.busName !== 'string' || b.busName.trim().length === 0)
    return { valid: false, message: 'busName is required' };

  if (!b.licensePlate || typeof b.licensePlate !== 'string' || b.licensePlate.trim().length === 0)
    return { valid: false, message: 'licensePlate is required' };

  if (!b.routeLabel || typeof b.routeLabel !== 'string' || b.routeLabel.trim().length === 0)
    return { valid: false, message: 'routeLabel is required' };

  return { valid: true };
}

export function validateReading(body: unknown): ValidationResult {
  const b = body as Record<string, unknown>;

  if (b.longitude === undefined || typeof b.longitude !== 'number' || b.longitude < -180 || b.longitude > 180)
    return { valid: false, message: 'longitude must be a number between -180 and 180' };

  if (b.latitude === undefined || typeof b.latitude !== 'number' || b.latitude < -90 || b.latitude > 90)
    return { valid: false, message: 'latitude must be a number between -90 and 90' };

  if (b.recordedAt !== undefined) {
    const d = new Date(b.recordedAt as string);
    if (isNaN(d.getTime()))
      return { valid: false, message: 'recordedAt must be a valid ISO 8601 date string' };
  }

  return { valid: true };
}