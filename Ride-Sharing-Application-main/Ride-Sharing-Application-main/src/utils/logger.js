/**
 * Simple, readable logging utility for college project debugging and request tracing
 */
const logger = {
  info: (msg, meta = '') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${msg}`, meta ? meta : '');
  },
  warn: (msg, meta = '') => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${msg}`, meta ? meta : '');
  },
  error: (msg, err = '') => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${msg}`, err ? err : '');
  },
  socket: (event, msg) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SOCKET:${event}] ${msg}`);
  }
};

module.exports = logger;
