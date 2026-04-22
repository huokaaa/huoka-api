// api/yt-search.js
// GET /yt-search?q=keyword&limit=10

const yts = require("yt-search");
const { setCors, sendSuccess, sendError } = require("./lib/helpers");

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed. Use GET.", 405);
  }

  const query = req.query.q || req.query.query;
  if (!query || !query.trim()) {
    return sendError(res, "Query parameter 'q' is required.", 400);
  }

  const limit = Math.min(parseInt(req.query.limit) || 10, 30); // max 30

  try {
    const result = await yts(query.trim());

    const videos = result.videos.slice(0, limit).map((v) => ({
      videoId: v.videoId,
      title: v.title,
      description: v.description?.slice(0, 200) || "",
      url: v.url,
      thumbnail: v.thumbnail,
      duration: {
        seconds: v.seconds,
        timestamp: v.timestamp,
      },
      views: v.views,
      author: {
        name: v.author?.name || null,
        url: v.author?.url || null,
      },
      uploadedAt: v.ago || null,
    }));

    return sendSuccess(res, {
      query: query.trim(),
      limit,
      total: videos.length,
      results: videos,
    });
  } catch (err) {
    console.error("[yt-search] error:", err);
    return sendError(res, "Failed to fetch YouTube search results.", 500, err.message);
  }
};
