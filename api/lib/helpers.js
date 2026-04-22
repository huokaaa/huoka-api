// lib/helpers.js — shared utilities buat semua endpoint

const START_TIME = Date.now();

/**
 * Set CORS headers + handle preflight
 * @returns {boolean} true kalau ini preflight request (langsung return)
 */
function setCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * Kirim response sukses
 */
function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Kirim response error
 */
function sendError(res, message, statusCode = 400, details = null) {
  const body = {
    success: false,
    timestamp: new Date().toISOString(),
    error: message,
  };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

/**
 * Uptime in seconds (approximate — serverless jadi per-cold-start)
 */
function getUptime() {
  return Math.floor((Date.now() - START_TIME) / 1000);
}

module.exports = { setCors, sendSuccess, sendError, getUptime };
