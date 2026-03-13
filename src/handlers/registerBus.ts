import { prisma } from '../config/db';
import { generateBusId } from '../utils/generateBusId';
import { generateApiKey } from '../utils/generateApiKey';
import { hashPassword } from '../utils/hash';
import { ok, fail } from '../utils/response';
import { requireSuperAdmin } from '../middleware/userAuth';

export async function registerBus(req: Request): Promise<Response> {
  try {
    // 1. Authenticate (requires SUPER_ADMIN)
    await requireSuperAdmin(req);

    // 2. Parse payload
    const body = await req.json();
    const { busName, licensePlate, routeLabel } = body as any;

    if (!busName || !licensePlate || !routeLabel) {
      return fail('busName, licensePlate, and routeLabel are required', 400);
    }

    // 3. Generate credentials
    const busId = generateBusId();
    const rawApiKey = generateApiKey();
    const apiKeyHash = await hashPassword(rawApiKey);

    // 4. Save to DB
    await prisma.bus.create({
      data: {
        busId,
        busName: busName.trim(),
        licensePlate: licensePlate.trim(),
        routeLabel: routeLabel.trim(),
        apiKeyHash,
      },
    });

    // 5. Return success with raw API key (to be flashed to device)
    return ok({
      busId,
      busName: busName.trim(),
      apiKey: rawApiKey,
    }, 'Bus registered successfully', 201);
  } catch (error: any) {
    if (error.message === 'Not implemented' || error.message.includes('Auth')) {
      return fail('Unauthorized / Admin access required', 403);
    }
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return fail('A bus with this license plate already exists', 409);
    }
    console.error('Error registering bus:', error);
    return fail('Internal server error', 500);
  }
}
