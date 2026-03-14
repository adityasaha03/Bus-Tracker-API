import { prisma } from '../config/db';
import { ok, fail } from '../utils/response';
import { parseBody } from '../utils/json';
import { validateUserReg } from '../utils/validate';
import { hashPassword } from '../utils/hash';
import { generateUserId } from '../utils/generateUserId';
import { registrationLimited } from '../utils/rateLimit';
import { signToken } from '../utils/jwt';
import type { UserRole } from '../types/index';

interface RegisterBody {
  name: string;
  austId: string;
  email: string;
  password: string;
  phone: string;
  role: string;
}

export async function registerUser(req: Request): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (registrationLimited(ip))
    return fail('Too many registration attempts, please try again later', 429);

  const body = await parseBody(req);
  if (!body) return fail('Invalid JSON body');

  const result = validateUserReg(body);
  if (!result.valid) return fail(result.message!);

  const { name, austId, email, password, phone, role } = body as RegisterBody;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { austId }] },
  });

  if (existing) {
    if (existing.email === email.toLowerCase()) return fail('Email already registered', 409);
    return fail('austId already registered', 409);
  }

  const user = await prisma.user.create({
    data: {
      userId: generateUserId(),
      name: name.trim(),
      austId: austId.trim(),
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      phone: phone.trim(),
      role: role as UserRole,
      status: 'ACTIVE',
    },
  });

  const token = signToken({ userId: user.userId, role: user.role as UserRole });

  return ok(
    { userId: user.userId, name: user.name, role: user.role, token },
    'User registered successfully',
    201
  );
}