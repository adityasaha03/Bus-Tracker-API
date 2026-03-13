import { connectDB, prisma } from './config/db';
import './config/redis.ts';
import { handleRequest } from './app.ts';
import { PORT } from './config/env.ts';

await connectDB();

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`Server running on port ${PORT}`);