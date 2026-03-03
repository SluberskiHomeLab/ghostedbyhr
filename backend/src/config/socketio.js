const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./secrets');

let io = null;

function setupSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join a personal room so we can emit to one user
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', () => {});
  });

  return io;
}

/**
 * Emit a notification event to a specific user's socket room.
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

function getIO() {
  return io;
}

module.exports = { setupSocketIO, emitToUser, getIO };
