import { health } from './handlers/health';
import { registerUser } from './handlers/registerUser';
import { authUser } from './handlers/authUser';
import { assignCoordinator } from './handlers/assignCoordinator';
import { registerBus } from './handlers/registerBus';
import { createReading } from './handlers/createReading';
import { getLatestPosition } from './handlers/getLatestPosition';
import { getMapLocation } from './handlers/getMapLocation';
import { getBusById } from './handlers/getBusById';
import { getReadings } from './handlers/getReadings';
import { fail } from './utils/response';

export async function handleRequest(req: Request): Promise<Response> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 100) {
    return fail('Request body too large', 413);
  }

  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id, x-api-key',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let response: Response;

    // Public routes
    if (method === 'GET' && path === '/api/health') {
      response = health(req);
    }

    // Auth routes
    else if (method === 'POST' && path === '/api/users/register') {
      response = await registerUser(req);
    }
    else if (method === 'POST' && path === '/api/users/login') {
      response = await authUser(req);
    }

    // Super admin routes
    else if (method === 'POST' && path === '/api/coordinators/assign') {
      response = await assignCoordinator(req);
    }
    else if (method === 'POST' && path === '/api/buses/register') {
      response = await registerBus(req);
    }

    // Device route
    else if (method === 'POST' && path === '/api/readings') {
      response = await createReading(req);
    }

    // Protected GET routes — JWT required
    else if (method === 'GET' && path === '/api/buses/map') {
      response = await getMapLocation(req);
    }
    else if (method === 'GET' && path.match(/^\/api\/buses\/wbx_bus_[a-zA-Z0-9]+\/position$/)) {
    const busId = path.split('/')[3] ?? '';
    response = await getLatestPosition(req, busId);
    }
    else if (method === 'GET' && path.match(/^\/api\/buses\/wbx_bus_[a-zA-Z0-9]+\/readings$/)) {
      const busId = path.split('/')[3] ?? '';
      response = await getReadings(req, busId);
    }
    else if (method === 'GET' && path.match(/^\/api\/buses\/wbx_bus_[a-zA-Z0-9]+$/) ) {
      const busId = path.split('/')[3] ?? '';
      response = await getBusById(req, busId);
    }

    // 404
    else {
      response = Response.json({ success: false, message: 'Route not found' }, { status: 404 });
    }

    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
    return new Response(response.body, { status: response.status, headers: newHeaders });

  } catch (err) {
    if (err instanceof Response) return err;
    console.error('Unhandled error:', err);
    return Response.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
