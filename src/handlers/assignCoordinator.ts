import { prisma } from '../config/db';
import { ok, fail } from '../utils/response';
import { parseBody } from '../utils/json';
import { requireSuperAdmin } from '../middleware/userAuth';

interface AssignBody {
  coordinatorUserId: string;
  busId: string;
}

export async function assignCoordinator(req: Request): Promise<Response> {
  try {
    await requireSuperAdmin(req);
  } catch (err) {
    return err as Response;
  }

  const body = await parseBody(req);
  if (!body) return fail('Invalid JSON body');

  const { coordinatorUserId, busId } = body as AssignBody;

  if (!coordinatorUserId || !busId)
    return fail('coordinatorUserId and busId are required');

  const user = await prisma.user.findUnique({
    where: { userId: coordinatorUserId },
  });
  if (!user) return fail('User not found', 404);
  if (user.role !== 'COORDINATOR') return fail('User is not a coordinator', 400);
  if (user.status === 'BLOCKED') return fail('User is blocked', 403);

  const bus = await prisma.bus.findUnique({
    where: { busId },
  });
  if (!bus) return fail('Bus not found', 404);
  if (bus.status === 'BLOCKED') return fail('Bus is blocked', 403);

  const existing = await prisma.coordinatorBus.findUnique({
    where: { userId_busId: { userId: user.id, busId: bus.id } },
  });
  if (existing) return fail('Coordinator already assigned to this bus', 409);

  await prisma.coordinatorBus.create({
    data: {
      userId: user.id,
      busId: bus.id,
    },
  });

  return ok(
    { coordinatorUserId, busId },
    'Coordinator assigned to bus successfully',
    201
  );
}