import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow connection from frontend dev server
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Join room for specific assignment updates
    socket.on('join-assignment', (assignmentId: string) => {
      socket.join(assignmentId);
      console.log(`Socket client ${socket.id} joined room: ${assignmentId}`);
    });

    socket.on('leave-assignment', (assignmentId: string) => {
      socket.leave(assignmentId);
      console.log(`Socket client ${socket.id} left room: ${assignmentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized. Please call initSocket first.');
  }
  return io;
};

export const emitToAssignmentRoom = (assignmentId: string, event: string, data: unknown): void => {
  if (io) {
    io.to(assignmentId).emit(event, data);
    console.log(`Emitted event "${event}" to assignment room "${assignmentId}"`);
  } else {
    console.warn(`Socket.io not initialized, skipped emitting "${event}" to room "${assignmentId}"`);
  }
};
