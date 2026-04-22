// api/ffmpeg.js
// POST /ffmpeg — compress/process video via Rendi (serverless FFmpeg API)
//
// Body (JSON):
// {
//   "url": "https://...",          — URL video publik (required)
//   "preset": "compress_sd" | "compress_hd" | "compress_720p" | "compress_480p" | "audio_only" | "gif" | "custom",
//   "command": "-i {{in_1}} ... {{out_1}}",  — hanya kalau preset = "custom"
//   "output": "output.mp4",        — nama file output (opsional, default: output.mp4)
//   "crf": 28                      — quality factor buat compress presets (opsional, 18-40, default 28)
// }
//
// Response (polling otomatis, max ~60 detik):
// {
//   "success": true,
//   "command_id": "...",
//   "status": "SUCCESS",
//   "output_url": "https://storage.rendi.dev/files/...",
//   "processing_seconds": 12.3,
//   "output_size_mb": 4.2
// }

const { setCors, sendSuccess, sendError } = require("./lib/helpers");

const RENDI_API_KEY = process.env.RENDI_API_KEY;
const RENDI_BASE    = "https://api.rendi.dev/v1";

// Preset definitions
const PRESETS = {
  compress_sd:  (crf) => `-i {{in_1}} -vcodec libx264 -crf ${crf} -preset fast -acodec aac -b:a 128k {{out_1}}`,
  compress_hd:  (crf) => `-i {{in_1}} -vcodec libx264 -crf ${crf} -preset fast -vf scale=-2:720 -acodec aac -b:a 128k {{out_1}}`,
  compress_720p:(crf) => `-i {{in_1}} -vcodec libx264 -crf ${crf} -preset fast -vf scale=1280:720:force_original_aspect_ratio=decrease -acodec aac -b:a 128k {{out_1}}`,
  compress_480p:(crf) => `-i {{in_1}} -vcodec libx264 -crf ${crf} -preset fast -vf scale=854:480:force_original_aspect_ratio=decrease -acodec aac -b:a 128k {{out_1}}`,
  audio_only:   ()    => `-i {{in_1}} -vn -acodec libmp3lame -q:a 4 {{out_1}}`,
  gif:          ()    => `-i {{in_1}} -vf "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 {{out_1}}`,
};

const DEFAULT_OUTPUT_EXT = {
  compress_sd:   "mp4",
  compress_hd:   "mp4",
  compress_720p: "mp4",
  compress_480p: "mp4",
  audio_only:    "mp3",
  gif:           "gif",
  custom:        "mp4",
};

// Poll Rendi sampai SUCCESS/FAILED, dengan timeout
async function pollCommand(commandId, maxWaitMs = 55000, intervalMs = 3000) {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const resp = await fetch(`${RENDI_BASE}/commands/${commandId}`, {
      headers: { "X-API-KEY": RENDI_API_KEY },
    });

    if (!resp.ok) throw new Error(`Poll failed: HTTP ${resp.status}`);

    const data = await resp.json();

    if (data.status === "SUCCESS" || data.status === "FAILED") {
      return data;
    }
    // QUEUED / PROCESSING → terus polling
  }

  throw new Error("Timeout: video masih diproses. Coba lagi dalam beberapa detik.");
}

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  if (req.method !== "POST") {
    return sendError(res, "Method not allowed. Use POST.", 405);
  }

  if (!RENDI_API_KEY) {
    return sendError(res, "Server misconfiguration: RENDI_API_KEY not set.", 500);
  }

  // Parse body
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { url, preset = "compress_sd", command: customCommand, crf = 28 } = body;

  // Validasi
  if (!url) {
    return sendError(res, "'url' is required — provide a public video URL.", 400);
  }
  if (!PRESETS[preset] && preset !== "custom") {
    return sendError(res, `Unknown preset '${preset}'. Available: ${Object.keys(PRESETS).join(", ")}, custom`, 400);
  }
  if (preset === "custom" && !customCommand) {
    return sendError(res, "preset 'custom' requires a 'command' field with {{in_1}} and {{out_1}} placeholders.", 400);
  }

  // Tentukan output filename
  const ext = DEFAULT_OUTPUT_EXT[preset] || "mp4";
  const outputFile = body.output || `output.${ext}`;

  // Build FFmpeg command
  const ffmpegCmd =
    preset === "custom"
      ? customCommand
      : PRESETS[preset](Math.max(18, Math.min(40, parseInt(crf) || 28)));

  try {
    // 1. Submit ke Rendi
    const submitResp = await fetch(`${RENDI_BASE}/run-ffmpeg-command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": RENDI_API_KEY,
      },
      body: JSON.stringify({
        input_files:  { in_1: url },
        output_files: { out_1: outputFile },
        ffmpeg_command: ffmpegCmd,
        max_command_run_seconds: 300,
        vcpu_count: 8,
      }),
    });

    if (!submitResp.ok) {
      const errBody = await submitResp.json().catch(() => ({}));
      throw new Error(`Rendi submit error ${submitResp.status}: ${JSON.stringify(errBody)}`);
    }

    const { command_id } = await submitResp.json();

    // 2. Poll sampai selesai
    const result = await pollCommand(command_id);

    if (result.status === "FAILED") {
      return sendError(res, "FFmpeg command failed on Rendi.", 502, {
        command_id,
        rendi_status: result.status,
      });
    }

    // 3. Ambil output URL
    const outFile = result.output_files?.out_1;
    const outputUrl = outFile?.storage_url || null;

    return sendSuccess(res, {
      command_id,
      status: "SUCCESS",
      preset,
      output_url: outputUrl,
      output_file: outputFile,
      output_size_mb: outFile?.size_mbytes
        ? parseFloat(outFile.size_mbytes.toFixed(3))
        : null,
      processing_seconds: result.total_processing_seconds
        ? parseFloat(result.total_processing_seconds.toFixed(2))
        : null,
      ffmpeg_run_seconds: result.ffmpeg_command_run_seconds
        ? parseFloat(result.ffmpeg_command_run_seconds.toFixed(2))
        : null,
    });

  } catch (err) {
    console.error("[ffmpeg] error:", err);

    // Kalau timeout, kasih info command_id biar bisa di-poll manual
    if (err.message.startsWith("Timeout")) {
      return sendError(res, err.message, 202, {
        hint: "Video masih diproses. Simpan command_id dan hit GET /ffmpeg-status?id=<command_id> untuk cek hasilnya.",
      });
    }

    return sendError(res, "Gagal memproses video via Rendi.", 500, err.message);
  }
};
