export type UserRole = 'SUPER_ADMIN' | 'COORDINATOR' | 'GENERAL';
export type UserStatus = 'ACTIVE' | 'BLOCKED';
export type BusStatus = 'ACTIVE' | 'BLOCKED';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

export interface RedisLatestPosition {
  busId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  lastSeenAt: string;
}