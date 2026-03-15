import { prisma } from '../config/db';
import { ok, fail } from '../utils/response';

export async function getReadings(req: Request, busId: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);

    const take = Math.min(limit > 0 ? limit : 50, 100);
    const skip = (page > 0 ? page - 1 : 0) * take;

    // Check if bus exists
    const bus = await prisma.bus.findUnique({
      where: { busId },
      select: { id: true }
    });

    if (!bus) {
      return fail('Bus not found', 404);
    }

    const [total, readings] = await Promise.all([
      prisma.reading.count({ where: { busId: bus.id } }),
      prisma.reading.findMany({
        where: { busId: bus.id },
        orderBy: { recordedAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          longitude: true,
          latitude: true,
          address: true,
          recordedAt: true,
          createdAt: true
        }
      })
    ]);

    return ok({
      readings,
      pagination: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    }, 'Readings retrieved');

  } catch (error) {
    console.error('Error fetching readings:', error);
    return fail('Internal server error', 500);
  }
}
