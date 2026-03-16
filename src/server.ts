import { connectDB, prisma } from './config/db';
import './config/redis';
import { handleRequest } from './app';
import { PORT } from './config/env';
import { getEngine } from './config/socket';
import { startCleanupJob } from './utils/cleanup';

await connectDB();

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

startCleanupJob();

const engine = getEngine();

Bun.serve({
  port: PORT,
  fetch: (req, server) => {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/socket.io/')) {
      return engine.handleRequest(req, server as any);
    }
    return handleRequest(req);
  },
});

console.log(`Server running on port ${PORT}`);