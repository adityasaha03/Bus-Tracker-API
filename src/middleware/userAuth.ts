import type { JwtPayload } from '../types/index';

export async function requireAuth(req: Request): Promise<JwtPayload> {
  throw new Error('Not implemented');
}

export async function requireSuperAdmin(req: Request): Promise<JwtPayload> {
  throw new Error('Not implemented');
}

export async function requireCoordinatorOrAbove(req: Request): Promise<JwtPayload> {
  throw new Error('Not implemented');
}

export async function requireBusAccess(req: Request, busId: string): Promise<JwtPayload> {
  throw new Error('Not implemented');
}