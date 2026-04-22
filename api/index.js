// api/index.js — root endpoint, nampilin semua route yang tersedia

const { setCors, sendSuccess } = require("./lib/helpers");

module.exports = (req, res) => {
  if (setCors(req, res)) return;

  return sendSuccess(res, {
    name: "huoka-api",
    version: "1.0.0",
    author: "Huoka",
    base_url: "https://api.huoka.eu.org",
    endpoints: [
      {
        path: "/yt-search",
        method: "GET",
        description: "Search YouTube videos",
        params: { q: "Search query (required)", limit: "Max results 1-30 (default 10)" },
        example: "/yt-search?q=lofi+hip+hop&limit=5",
      },
      {
        path: "/yt-song",
        method: "GET",
        description: "Get top YouTube video result for a song query",
        params: { q: "Song title or query (required)" },
        example: "/yt-song?q=bohemian+rhapsody",
      },
      {
        path: "/yt-playlist",
        method: "GET",
        description: "Get all videos from a YouTube playlist",
        params: { id: "YouTube Playlist ID (required)" },
        example: "/yt-playlist?id=PLxxxxxxxx",
      },
      {
        path: "/yt-mp3",
        method: "GET",
        description: "Get MP3 download link for a YouTube video via Eliteprotech",
        params: { url: "YouTube video URL (required)" },
        example: "/yt-mp3?url=https://youtu.be/dQw4w9WgXcQ",
      },
      {
        path: "/ffmpeg",
        method: "POST",
        description: "Compress / convert video using serverless FFmpeg (via Rendi)",
        body: {
          url: "Public video URL (required)",
          preset: "compress_sd | compress_hd | compress_720p | compress_480p | audio_only | gif | custom",
          crf: "Quality 18-40, lower = better (default: 28)",
          output: "Output filename (optional)",
          command: "Custom FFmpeg command — only for preset=custom, use {{in_1}} and {{out_1}}",
        },
        example: "POST /ffmpeg { \"url\": \"https://...\", \"preset\": \"compress_480p\", \"crf\": 30 }",
      },
      {
        path: "/ffmpeg-status",
        method: "GET",
        description: "Check status of a pending /ffmpeg job (for timeout cases)",
        params: { id: "command_id from /ffmpeg response (required)" },
        example: "/ffmpeg-status?id=089dd36c-...",
      },
      {
        path: "/health",
        method: "GET",
        description: "API health check — memory, uptime, node version",
        example: "/health",
      },
    ],
  });
};
