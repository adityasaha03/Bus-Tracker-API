import { health } from './handlers/health.ts';
import { registerBus } from './handlers/registerBus.ts';
import { createReading } from './handlers/createReading.ts';
import { getLatestPosition } from './handlers/getLatestPosition.ts';
import { getMapLocation } from './handlers/getMapLocation.ts';
import { getBusById } from './handlers/getBusById.ts';
import { getReadings } from './handlers/getReadings.ts';
import { requireAuth } from './middleware/userAuth.ts';

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  try {
    // Public routes
    if (method === 'GET' && path === '/api/health') return health(req);

    // Device routes
    if (method === 'POST' && path === '/api/readings') return await createReading(req);

    // Admin routes
    if (method === 'POST' && path === '/api/buses/register') return await registerBus(req);

    // Protected API routes
    if (path.startsWith('/api/') && method === 'GET') {
      await requireAuth(req); // Enforce JWT for all GET routes below this
      
      if (path === '/api/buses/map') {
        return await getMapLocation(req);
      }

      const positionMatch = path.match(/^\/api\/buses\/(wbx_bus_[a-zA-Z0-9_]+)\/position$/);
      if (positionMatch && positionMatch[1]) {
        return await getLatestPosition(req, positionMatch[1]);
      }

      const readingsMatch = path.match(/^\/api\/buses\/(wbx_bus_[a-zA-Z0-9_]+)\/readings$/);
      if (readingsMatch && readingsMatch[1]) {
         return await getReadings(req, readingsMatch[1]);
      }

      const busDetailMatch = path.match(/^\/api\/buses\/(wbx_bus_[a-zA-Z0-9_]+)$/);
      if (busDetailMatch && busDetailMatch[1]) {
         return await getBusById(req, busDetailMatch[1]);
      }
    }

    return Response.json({ success: false, message: 'Route not found' }, { status: 404 });
  } catch (err: any) {
    if (err.message === 'Not implemented') {
       return Response.json({ success: false, message: 'Auth middleware not implemented yet' }, { status: 501 });
    }
    return Response.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}