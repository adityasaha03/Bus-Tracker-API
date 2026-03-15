import { prisma } from '../config/db';
import { fail } from '../utils/response';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import type { JwtPayload } from '../types/index';

function verifyToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.id && !payload.userId) {
      payload.userId = payload.id;
    }
    return payload as JwtPayload;
  } catch {
    throw fail('Invalid or expired token', 401);
  }
}

export async function requireAuth(req: Request): Promise<JwtPayload> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer '))
    throw fail('Missing or invalid authorization header', 401);

  const token = authHeader.split(' ')[1];
  if (!token)
    throw fail('Missing token', 401);

  return verifyToken(token);
}

export async function requireSuperAdmin(req: Request): Promise<JwtPayload> {
  const payload = await requireAuth(req);
  if (payload.role !== 'SUPER_ADMIN')
    throw fail('Super admin access required', 403);
  return payload;
}

export async function requireCoordinatorOrAbove(req: Request): Promise<JwtPayload> {
  const payload = await requireAuth(req);
  if (!['SUPER_ADMIN', 'COORDINATOR'].includes(payload.role))
    throw fail('Coordinator or admin access required', 403);
  return payload;
}

export async function requireBusAccess(req: Request, busId: string): Promise<JwtPayload> {
  const payload = await requireAuth(req);

  if (payload.role === 'SUPER_ADMIN') return payload;

  if (payload.role === 'GENERAL')
    throw fail('Access denied', 403);

  const assignment = await prisma.coordinatorBus.findFirst({
    where: { userId: payload.userId, bus: { busId } },
  });
  if (!assignment)
    throw fail('You are not assigned to this bus', 403);

  return payload;
}