export function health(_req: Request): Response {
  return Response.json({ success: true, message: 'Bus Tracker API is running' });
}