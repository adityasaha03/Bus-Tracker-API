import { prisma } from '../config/db';
import { ok, fail } from '../utils/response';
import { parseBody } from '../utils/json';
import { validateLogin } from '../utils/validate';
import { verifyPassword } from '../utils/hash';
import { signToken } from '../utils/jwt';
import { registrationLimited } from '../utils/rateLimit';
import type { UserRole } from '../types/index';

interface LoginBody {
  email: string;
  password: string;
}

export async function authUser(req: Request): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (registrationLimited(ip))
    return fail('Too many login attempts, please try again later', 429);

  const body = await parseBody(req);
  if (!body) return fail('Invalid JSON body');

  const result = validateLogin(body);
  if (!result.valid) return fail(result.message!);

  const { email, password } = body as LoginBody;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return fail('Invalid credentials', 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return fail('Invalid credentials', 401);

  if (user.status === 'BLOCKED') return fail('Account is blocked', 403);

  const token = signToken({ userId: user.userId, role: user.role as UserRole });

  return ok(
    { userId: user.userId, name: user.name, role: user.role, token },
    'Login successful'
  );
}