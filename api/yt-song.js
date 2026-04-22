// api/yt-song.js
// GET /yt-song?query=judul+lagu

const yts = require("yt-search");
const { setCors, sendSuccess, sendError } = require("./lib/helpers");

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed. Use GET.", 405);
  }

  const query = req.query.query || req.query.q;
  if (!query || !query.trim()) {
    return sendError(res, "Query parameter 'query' is required.", 400);
  }

  try {
    // Cari video di YouTube
    const { videos } = await yts(query.trim());

    if (!videos || videos.length === 0) {
      return sendError(res, "Lagu tidak ditemukan.", 404);
    }

    // Ambil hasil pertama (paling relevan)
    const video = videos[0];

    return sendSuccess(res, {
      title: video.title,
      url: video.url,
      duration: video.timestamp,
      author: video.author.name,
      thumbnail: video.thumbnail,
      views: video.views
    });

  } catch (err) {
    console.error("[yt-song] error:", err);
    return sendError(res, "Gagal mencari lagu.", 500, err.message);
  }
};