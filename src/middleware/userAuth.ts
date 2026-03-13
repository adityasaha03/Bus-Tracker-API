import type { JwtPayload, AuthedRequest } from '../types/index.ts';

export async function requireAuth(req: Request): Promise<JwtPayload> {
  // Dev A implements — verifies JWT, returns payload or throws Response
  throw new Error('Not implemented');
}

export async function requireSuperAdmin(req: Request): Promise<JwtPayload> {
  // Dev A implements — role must be SUPER_ADMIN
  throw new Error('Not implemented');
}

export async function requireCoordinatorOrAbove(req: Request): Promise<JwtPayload> {
  // Dev A implements — role must be SUPER_ADMIN or COORDINATOR
  throw new Error('Not implemented');
}

export async function requireBusAccess(req: Request, busId: string): Promise<JwtPayload> {
  // Dev A implements — SUPER_ADMIN passes always, COORDINATOR only if assigned to this busId
  // GENERAL always fails with 403
  throw new Error('Not implemented');
}