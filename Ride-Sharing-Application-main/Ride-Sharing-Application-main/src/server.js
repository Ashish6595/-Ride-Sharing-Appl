const http = require('http');
const app = require('./app');
const config = require('./config/config');
const { connectDatabase } = require('./config/database');
const { initSocket } = require('./services/socketService');
const logger = require('./utils/logger');

const server = http.createServer(app);

// Initialize Socket.io real-time engine
initSocket(server);

// Start server after establishing database connection
async function startServer() {
  try {
    await connectDatabase();
    logger.info('Database synchronized successfully.');

    server.listen(config.port, () => {
      logger.info(`=======================================================`);
      logger.info(` Ride-Sharing Backend Server running on port ${config.port}`);
      logger.info(` Environment: ${config.nodeEnv}`);
      logger.info(` Live Simulator Web UI: http://localhost:${config.port}`);
      logger.info(` Swagger Interactive Docs: http://localhost:${config.port}/api-docs`);
      logger.info(` Health Check: http://localhost:${config.port}/health`);
      logger.info(`=======================================================`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = {
  server,
  startServer
};
