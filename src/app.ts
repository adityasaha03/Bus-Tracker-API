import { health } from './handlers/health.ts';

export function handleRequest(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  if (method === 'GET' && path === '/api/health') return health(req);

  return Response.json({ success: false, message: 'Route not found' }, { status: 404 });
}