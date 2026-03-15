import { Server as Engine } from '@socket.io/bun-engine';
import { Server } from 'socket.io';

const io = new Server();
const engine = new Engine({
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
io.bind(engine);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

export function getIO(): Server {
  return io;
}

export function getEngine() {
  return engine;
}
