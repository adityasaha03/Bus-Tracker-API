import { health } from './handlers/health';
import { registerUser } from './handlers/registerUser';
import { authUser } from './handlers/authUser';
import { assignCoordinator } from './handlers/assignCoordinator';

export async function handleRequest(req: Request): Promise<Response> {
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

    if (method === 'GET' && path === '/api/health') response = health(req);
    else if (method === 'POST' && path === '/api/users/register') response = await registerUser(req);
    else if (method === 'POST' && path === '/api/users/login') response = await authUser(req);
    else if (method === 'POST' && path === '/api/coordinators/assign') response = await assignCoordinator(req);
    else response = Response.json({ success: false, message: 'Route not found' }, { status: 404 });

    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
    return new Response(response.body, { status: response.status, headers: newHeaders });

  } catch (err) {
    if (err instanceof Response) return err;
    console.error('Unhandled error:', err);
    return Response.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
