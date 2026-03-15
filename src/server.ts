import { connectDB, prisma } from './config/db';
import './config/redis.ts';
import { handleRequest } from './app.ts';
import { PORT } from './config/env.ts';
import { getEngine } from './config/socket.ts';
import { startCleanupJob } from './utils/cleanup.ts';

await connectDB();

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Start background cleanup (runs every hour)
startCleanupJob();

const engine = getEngine();

Bun.serve({
  port: PORT,
  ...engine.handler(),
  fetch: (req, server) => {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/socket.io/')) {
       return engine.handleRequest(req, server);
    }
    return handleRequest(req);
  },
});

console.log(`Server running on port ${PORT}`);