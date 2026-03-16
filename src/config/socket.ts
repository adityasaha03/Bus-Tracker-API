import { Server as Engine } from '@socket.io/bun-engine';
import { Server } from 'socket.io';

const engine = new Engine();

const io = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.bind(engine);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('subscribe-bus', (busId: string) => {
    socket.join(`bus:${busId}`);
    console.log(`Socket ${socket.id} subscribed to bus:${busId}`);
  });

  socket.on('unsubscribe-bus', (busId: string) => {
    socket.leave(`bus:${busId}`);
  });

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