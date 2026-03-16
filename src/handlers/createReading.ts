import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { ok, fail } from '../utils/response';
import { getIO } from '../config/socket';
import { verifyPassword } from '../utils/hash';

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

    const isKeyValid = await verifyPassword(apiKey, bus.apiKeyHash);
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

    // --- GEOCODING LOGIC WITH THROTTLING & FALLBACK ---
    let address: string | null = null;
    const throttleKey = `geo:throttle:${bus.busId}`;
    const isThrottled = await redis.get(throttleKey);

    if (!isThrottled) {
      try {
        const { getAddressFromCoords } = await import('../utils/geocoding');
        address = await getAddressFromCoords(latitude, longitude);

        if (address) {
          await redis.set(throttleKey, '1', 'EX', 30);
        }
      } catch (err) {
        console.error('[GEOCODING] Error during processing:', err);
      }
    }

    if (!address) {
      const lastKnown = await redis.get(`bus:latest:${bus.busId}`);
      if (lastKnown) {
        try {
          const parsed = JSON.parse(lastKnown);
          address = parsed.address || null;
        } catch (e) { /* ignore parse errors */ }
      }
    }
    // ---------------------------------------------------

    await prisma.$queryRaw<any[]>`
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
    `;

    await prisma.bus.update({
      where: { id: bus.id },
      data: { lastSeenAt: recordTime },
    });

    const latestPosParams = {
      busId: bus.busId,
      latitude,
      longitude,
      address,
      recordedAt: recordTime.toISOString(),
      lastSeenAt: new Date().toISOString(),
    };

    // Write to Redis — failure must not crash the request
    try {
      await redis.set(`bus:latest:${bus.busId}`, JSON.stringify(latestPosParams));
    } catch (err) {
      console.error('[REDIS] Failed to write latest position:', err);
    }

    // Emit via WebSocket — to subscribed room + global map listeners
    try {
      const io = getIO();
      io.to(`bus:${bus.busId}`).emit('position-update', latestPosParams);
      io.to('map').emit('position-update', latestPosParams);
    } catch (err) {
      console.error('[SOCKET] Failed to emit position update:', err);
    }

    return ok(
      {
        busId: bus.busId,
        latitude,
        longitude,
        address,
        recordedAt: recordTime.toISOString(),
      },
      'Reading stored successfully',
      201
    );
  } catch (error: any) {
    console.error('CRITICAL ERROR in createReading:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });
    return fail('Internal server error', 500);
  }
}