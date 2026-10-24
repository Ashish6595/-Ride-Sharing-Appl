const socketIO = require('socket.io');
const logger = require('../utils/logger');

let io = null;

/**
 * Initialize Socket.io on the shared HTTP server.
 *
 * @param {Object} server HTTP Server instance
 */
function initSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    logger.socket('connect', `Client connected: ${socket.id}`);

    // Join personal notification channel
    socket.on('join', (data) => {
      if (data && data.userId) {
        const userRoom = `user_${data.userId}`;
        socket.join(userRoom);
        logger.socket('join', `User ${data.userId} joined room ${userRoom}`);

        if (data.role === 'driver') {
          socket.join('drivers_pool');
          logger.socket('join', `Driver ${data.userId} joined drivers_pool`);
        }
      }
    });

    // Driver updates live GPS coordinates
    socket.on('driver:location_update', (data) => {
      // Broadcast live location to any rider watching this specific ride
      if (data && data.rideId) {
        socket.to(`ride_${data.rideId}`).emit('ride:driver_moved', {
          rideId: data.rideId,
          lat: data.lat,
          lng: data.lng,
          heading: data.heading || 0,
          updatedAt: new Date()
        });
      }
    });

    // Rider joins specific ride live-tracking room
    socket.on('ride:watch', (data) => {
      if (data && data.rideId) {
        socket.join(`ride_${data.rideId}`);
        logger.socket('watch', `Socket ${socket.id} joined ride_${data.rideId}`);
      }
    });

    socket.on('disconnect', () => {
      logger.socket('disconnect', `Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get the current socket.io server instance
 */
function getIO() {
  return io;
}

/**
 * Helper to emit ride events to specific users or rooms
 */
const socketEvents = {
  // Broadcast new ride request to available drivers
  notifyNewRideRequest: (rideData, candidateDriverIds = []) => {
    if (!io) return;
    if (candidateDriverIds.length > 0) {
      candidateDriverIds.forEach((driverId) => {
        io.to(`user_${driverId}`).emit('ride:incoming_request', rideData);
      });
    } else {
      io.to('drivers_pool').emit('ride:incoming_request', rideData);
    }
    logger.socket('broadcast', `New ride #${rideData.id} broadcast to candidate drivers`);
  },

  // Notify rider that a driver accepted their request
  notifyRideAccepted: (riderId, rideData, driverProfile) => {
    if (!io) return;
    io.to(`user_${riderId}`).emit('ride:accepted', {
      ride: rideData,
      driver: driverProfile
    });
    logger.socket('emit', `Ride #${rideData.id} accepted notification sent to rider ${riderId}`);
  },

  // Notify both parties when ride status changes
  notifyStatusUpdate: (rideId, riderId, driverId, status, payload = {}) => {
    if (!io) return;
    const eventPayload = { rideId, status, timestamp: new Date(), ...payload };

    if (riderId) io.to(`user_${riderId}`).emit('ride:status_changed', eventPayload);
    if (driverId) io.to(`user_${driverId}`).emit('ride:status_changed', eventPayload);
    io.to(`ride_${rideId}`).emit('ride:status_changed', eventPayload);

    logger.socket('emit', `Ride #${rideId} status changed to '${status}'`);
  },

  // Notify ride cancellation
  notifyRideCancelled: (rideId, riderId, driverId, reason, cancelledBy) => {
    if (!io) return;
    const cancelPayload = { rideId, status: 'cancelled', reason, cancelledBy, timestamp: new Date() };

    if (riderId) io.to(`user_${riderId}`).emit('ride:cancelled', cancelPayload);
    if (driverId) io.to(`user_${driverId}`).emit('ride:cancelled', cancelPayload);
    io.to(`ride_${rideId}`).emit('ride:cancelled', cancelPayload);
  }
};

module.exports = {
  initSocket,
  getIO,
  socketEvents
};
