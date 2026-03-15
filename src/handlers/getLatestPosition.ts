import { redis } from '../config/redis';
import { ok, fail } from '../utils/response';

export async function getLatestPosition(req: Request, busId: string): Promise<Response> {
  try {
    const data = await redis.get(`bus:latest:${busId}`);
    if (!data) {
      return ok(null, 'No recent position found');
    }
    return ok(JSON.parse(data), 'Latest position retrieved');
  } catch (error) {
    console.error('Error fetching latest position:', error);
    return fail('Internal server error', 500);
  }
}
