import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { ok, fail } from '../utils/response';

export async function getMapLocation(req: Request): Promise<Response> {
  try {
    // 1. Get all active buses from DB
    const buses = await prisma.bus.findMany({
      where: { status: 'ACTIVE' },
      select: { busId: true, busName: true, routeLabel: true, licensePlate: true, lastSeenAt: true }
    });

    if (buses.length === 0) {
      return ok([], 'No active buses');
    }

    // 2. Cross reference with Redis for live coordinates using pipeline/mget
    const keys = buses.map(b => `bus:latest:${b.busId}`);
    const redisResults = await redis.mget(...keys);

    const mapData = buses.map((bus, idx) => {
      let position = null;
      if (redisResults[idx]) {
        try {
          position = JSON.parse(redisResults[idx] as string);
        } catch (e) {
             // JSON parse error, ignore
        }
      }

      return {
        ...bus,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
        address: position?.address ?? null,
      };
    });

    return ok(mapData, 'Map locations retrieved');
  } catch (error) {
    console.error('Error fetching map locations:', error);
    return fail('Internal server error', 500);
  }
}
