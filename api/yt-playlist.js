// api/yt-playlist.js
// GET /yt-playlist?id=PLxxxxxxx

const yts = require("yt-search");
const { setCors, sendSuccess, sendError } = require("./lib/helpers");

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed. Use GET.", 405);
  }

  const playlistId = req.query.id;
  if (!playlistId || !playlistId.trim()) {
    return sendError(res, "Query parameter 'id' (playlist ID) is required.", 400);
  }

  try {
    const result = await yts({ listId: playlistId.trim() });

    const videos = result.videos.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnail,
      duration: {
        seconds: v.seconds,
        timestamp: v.timestamp,
      },
      author: {
        name: v.author?.name || null,
        url: v.author?.url || null,
      },
    }));

    return sendSuccess(res, {
      playlistId: playlistId.trim(),
      total: videos.length,
      results: videos,
    });
  } catch (err) {
    console.error("[yt-playlist] error:", err);
    return sendError(res, "Failed to fetch playlist.", 500, err.message);
  }
};
