// api/yt-mp3.js
const { setCors, sendSuccess, sendError } = require("./lib/helpers");

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  const { url } = req.query;
  if (!url) return sendError(res, "Query parameter 'url' is required.", 400);

  try {
    // Tembak API eliteprotech
    const apiUrl = `https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(url)}`;
    
    // Pakai fetch bawaan Node.js (Vercel Node 18+)
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Eliteprotech API returned status ${response.status}`);
    }

    const data = await response.json();

    // Mapping hasil sesuai struktur eliteprotech yang ada di bot kamu
    const audioUrl =
      data?.result?.download    ||
      data?.result?.downloadUrl ||
      data?.result?.url         ||
      data?.result?.audio       ||
      data?.download            ||
      data?.url                 ||
      null;

    if (!audioUrl) {
      return sendError(res, "Gagal mendapatkan link download dari provider.", 502, data);
    }

    return sendSuccess(res, {
      title: data?.result?.title || "YouTube Audio",
      thumbnail: data?.result?.thumbnail || null,
      duration: data?.result?.duration || null,
      download_url: audioUrl,
      source: "Eliteprotech Scraper"
    });

  } catch (err) {
    console.error("[yt-mp3-elite] error:", err);
    return sendError(res, "Gagal memproses request via Eliteprotech.", 500, err.message);
  }
};