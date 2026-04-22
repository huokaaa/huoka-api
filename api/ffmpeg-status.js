// api/ffmpeg-status.js
// GET /ffmpeg-status?id=<command_id>
// Cek status command Rendi yang udah disubmit sebelumnya

const { setCors, sendSuccess, sendError } = require("./lib/helpers");

const RENDI_API_KEY = process.env.RENDI_API_KEY;
const RENDI_BASE    = "https://api.rendi.dev/v1";

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed. Use GET.", 405);
  }

  if (!RENDI_API_KEY) {
    return sendError(res, "Server misconfiguration: RENDI_API_KEY not set.", 500);
  }

  const commandId = req.query.id;
  if (!commandId) {
    return sendError(res, "Query parameter 'id' (command_id) is required.", 400);
  }

  try {
    const resp = await fetch(`${RENDI_BASE}/commands/${commandId}`, {
      headers: { "X-API-KEY": RENDI_API_KEY },
    });

    if (resp.status === 404) {
      return sendError(res, `Command '${commandId}' not found.`, 404);
    }
    if (!resp.ok) {
      throw new Error(`Rendi returned HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const outFile = data.output_files?.out_1;

    return sendSuccess(res, {
      command_id: data.command_id,
      status: data.status,                 // QUEUED | PROCESSING | SUCCESS | FAILED
      output_url: outFile?.storage_url || null,
      output_size_mb: outFile?.size_mbytes
        ? parseFloat(outFile.size_mbytes.toFixed(3))
        : null,
      processing_seconds: data.total_processing_seconds
        ? parseFloat(data.total_processing_seconds.toFixed(2))
        : null,
    });

  } catch (err) {
    console.error("[ffmpeg-status] error:", err);
    return sendError(res, "Gagal mengambil status command.", 500, err.message);
  }
};
