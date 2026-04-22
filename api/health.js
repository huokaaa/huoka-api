// api/health.js
// GET /health

const { setCors, sendSuccess, getUptime } = require("./lib/helpers");

const ENDPOINTS = [
  { path: "/yt-search",    method: "GET"  },
  { path: "/yt-song",      method: "GET"  },
  { path: "/yt-playlist",  method: "GET"  },
  { path: "/yt-mp3",       method: "GET"  },
  { path: "/ffmpeg",       method: "POST" },
  { path: "/ffmpeg-status",method: "GET"  },
  { path: "/health",       method: "GET"  },
];

module.exports = (req, res) => {
  if (setCors(req, res)) return;

  const mem = process.memoryUsage();

  return sendSuccess(res, {
    status: "ok",
    name: "huoka-api",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    uptime_seconds: getUptime(),
    memory: {
      rss_mb:        (mem.rss        / 1024 / 1024).toFixed(2),
      heap_used_mb:  (mem.heapUsed   / 1024 / 1024).toFixed(2),
      heap_total_mb: (mem.heapTotal  / 1024 / 1024).toFixed(2),
    },
    node_version: process.version,
    endpoints: ENDPOINTS,
  });
};
