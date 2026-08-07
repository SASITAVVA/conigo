/**
 * Lightweight structured logging utility for server telemetry
 */

export const logger = {
  info(message, meta = {}) {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
  },
  warn(message, meta = {}) {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
  },
  error(message, error = null) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error ? (error.stack || error) : '');
  },
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? meta : '');
    }
  }
};

export default logger;
