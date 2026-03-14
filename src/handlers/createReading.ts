import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { ok, fail } from '../utils/response';
import { getIO } from '../config/socket';
import { comparePasswords } from '../utils/hash';

export async function createReading(req: Request): Promise<Response> {
  const deviceId = req.headers.get('x-device-id');
  const apiKey = req.headers.get('x-api-key');

  if (!deviceId || !apiKey) {
    return fail('x-device-id and x-api-key headers are required', 401);
  }

  try {
    const bus = await prisma.bus.findUnique({ where: { busId: deviceId } });
    
    if (!bus) return fail('Invalid device credentials', 401);
    if (bus.status === 'BLOCKED') return fail('Device is blocked', 403);

    const isKeyValid = await comparePasswords(apiKey, bus.apiKeyHash);
    if (!isKeyValid) return fail('Invalid device credentials', 401);

    const body = await req.json();
    const { longitude, latitude, recordedAt } = body as any;

    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return fail('longitude and latitude must be numbers', 400);
    }
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return fail('Coordinates out of bounds', 400);
    }

    const recordTime = recordedAt ? new Date(recordedAt) : new Date();

    // --- GEODCODING LOGIC WITH THROTTLING & FALLBACK ---
    let address: string | null = null;
    const throttleKey = `geo:throttle:${bus.busId}`;
    const isThrottled = await redis.get(throttleKey);

    if (!isThrottled) {
      try {
        const { getAddressFromCoords } = await import('../utils/geocoding');
        address = await getAddressFromCoords(latitude, longitude);
        
        if (address) {
          // Only update throttle if we actually got a new address
          await redis.set(throttleKey, '1', 'EX', 30);
        }
      } catch (err) {
        console.error('[GEOCODING] Error during processing:', err);
      }
    }

    // Fallback: If address is still null (throttled or failed), try to get last known address from Redis
    if (!address) {
      const lastKnown = await redis.get(`bus:latest:${bus.busId}`);
      if (lastKnown) {
        try {
          const parsed = JSON.parse(lastKnown);
          address = parsed.address || null;
        } catch (e) { /* ignore parse errors */ }
      }
    }
    // ----------------------------------------------------

    // 1. Insert to Postgres (PostGIS requires raw query or Prisma mapping; the schema has Unsupported("geometry(Point, 4326)"))
    // Wait for the result to get the `id` from returning
    const [insertedReading] = await prisma.$queryRaw<any[]>`
      INSERT INTO "Reading" ("id", "busId", "longitude", "latitude", "location", "address", "recordedAt", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${bus.id},
        ${longitude},
        ${latitude},
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
        ${address},
        ${recordTime},
        NOW()
      )
      RETURNING "id";
    `;

    await prisma.bus.update({
      where: { id: bus.id },
      data: { lastSeenAt: recordTime }
    });

    // 2. Write to Redis
    const latestPosParams = {
      busId: bus.busId,
      latitude,
      longitude,
      address,
      recordedAt: recordTime.toISOString(),
      lastSeenAt: new Date().toISOString()
    };
    
    // We can also have an expiry
    await redis.set(`bus:latest:${bus.busId}`, JSON.stringify(latestPosParams));

    // 3. Emit via WebSockets
    const io = getIO();
    io.emit('busPositionUpdate', latestPosParams);

    return ok({
      busId: bus.busId,
      latitude,
      longitude,
      address,
      recordedAt: recordTime.toISOString()
    }, 'Reading stored successfully', 201);
  } catch (error: any) {
    console.error('CRITICAL ERROR in createReading:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    });
    return fail('Internal server error', 500);
  }
}
