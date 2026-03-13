import { prisma } from '../config/db';
import { ok, fail } from '../utils/response';

export async function getBusById(req: Request, busId: string): Promise<Response> {
  try {
    const bus = await prisma.bus.findUnique({
      where: { busId },
      select: {
         id: true,
         busId: true,
         busName: true,
         licensePlate: true,
         routeLabel: true,
         status: true,
         lastSeenAt: true,
         createdAt: true,
         updatedAt: true
      }
    });

    if (!bus) return fail('Bus not found', 404);

    return ok(bus, 'Bus metadata retrieved');
  } catch (error) {
    console.error('Error fetching bus metadata:', error);
    return fail('Internal server error', 500);
  }
}
