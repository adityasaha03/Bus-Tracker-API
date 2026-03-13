import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import type { JwtPayload } from '../types/index';

function verifyToken(req: Request): JwtPayload {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized / Auth header missing');
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new Error('Unauthorized / Token missing');
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // ensure userId is mapped properly from my mock token which had id
    if (payload.id && !payload.userId) {
      payload.userId = payload.id;
    }
    return payload as JwtPayload;
  } catch (error) {
    throw new Error('Unauthorized / Invalid token');
  }
}

export async function requireAuth(req: Request): Promise<JwtPayload> {
  return verifyToken(req);
}

export async function requireSuperAdmin(req: Request): Promise<JwtPayload> {
  const payload = verifyToken(req);
  if (payload.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized / Admin access required');
  }
  return payload;
}

export async function requireCoordinatorOrAbove(req: Request): Promise<JwtPayload> {
  const payload = verifyToken(req);
  if (payload.role !== 'SUPER_ADMIN' && payload.role !== 'COORDINATOR') {
    throw new Error('Unauthorized / Coordinator access required');
  }
  return payload;
}

export async function requireBusAccess(req: Request, busId: string): Promise<JwtPayload> {
  return verifyToken(req);
}