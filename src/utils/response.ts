export const ok = (data: unknown, message = 'Success', status = 200): Response =>
  Response.json({ success: true, message, data }, { status });

export const fail = (message: string, status = 400): Response =>
  Response.json({ success: false, message }, { status });