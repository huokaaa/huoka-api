# huoka-api

A modular serverless REST API built with Node.js, deployed on Vercel.

**Base URL:** `https://api.huoka.eu.org`

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all available endpoints |
| GET | `/yt-search` | Search YouTube videos |
| GET | `/yt-song` | Get top result for a song query |
| GET | `/yt-playlist` | Get videos from a YouTube playlist |
| GET | `/yt-mp3` | Get MP3 download link for a YouTube video |
| POST | `/ffmpeg` | Compress or convert video via Rendi serverless FFmpeg |
| GET | `/ffmpeg-status` | Poll the status of a pending FFmpeg job |
| GET | `/health` | API health check |

---

## Usage

### GET `/yt-search`

```
GET /yt-search?q=lofi+hip+hop&limit=5
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | yes | Search query |
| `limit` | number | no | Max results (default: 10, max: 30) |

---

### GET `/yt-song`

```
GET /yt-song?q=bohemian+rhapsody
```

Returns the single most relevant video for the query.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | yes | Song title or search query |

---

### GET `/yt-playlist`

```
GET /yt-playlist?id=PLxxxxxxxx
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | yes | YouTube playlist ID |

---

### GET `/yt-mp3`

```
GET /yt-mp3?url=https://youtu.be/dQw4w9WgXcQ
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | yes | YouTube video URL |

---

### POST `/ffmpeg`

Compress or convert a video using serverless FFmpeg via [Rendi](https://rendi.dev).

```bash
curl -X POST https://api.huoka.eu.org/ffmpeg \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/video.mp4", "preset": "compress_480p", "crf": 28}'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | yes | Publicly accessible video URL |
| `preset` | string | no | See presets table below (default: `compress_sd`) |
| `crf` | number | no | Quality factor, 18–40, lower = better quality (default: 28) |
| `output` | string | no | Output filename (e.g. `result.mp4`) |
| `command` | string | only for `custom` preset | Raw FFmpeg command using `{{in_1}}` and `{{out_1}}` placeholders |

**Available presets:**

| Preset | Output | Description |
|--------|--------|-------------|
| `compress_sd` | mp4 | General compression, no rescale |
| `compress_hd` | mp4 | Rescale to 720p height |
| `compress_720p` | mp4 | Rescale to 1280x720 |
| `compress_480p` | mp4 | Rescale to 854x480 |
| `audio_only` | mp3 | Extract audio as MP3 |
| `gif` | gif | Convert to 480px-wide GIF |
| `custom` | mp4 | Provide your own FFmpeg command |

**Custom preset example:**

```json
{
  "url": "https://example.com/video.mp4",
  "preset": "custom",
  "output": "clip.mp4",
  "command": "-i {{in_1}} -ss 00:00:05 -t 30 -c copy {{out_1}}"
}
```

**Response:**

```json
{
  "success": true,
  "command_id": "089dd36c-723c-4a0a-b68a-8e8cbcc1afd2",
  "status": "SUCCESS",
  "output_url": "https://storage.rendi.dev/files/...",
  "output_size_mb": 4.2,
  "processing_seconds": 12.3
}
```

> If the job takes longer than ~55 seconds (Vercel's function limit), the response returns a `command_id` with HTTP 202. Use `/ffmpeg-status` to retrieve the result.

---

### GET `/ffmpeg-status`

```
GET /ffmpeg-status?id=089dd36c-723c-4a0a-b68a-8e8cbcc1afd2
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | yes | `command_id` returned by `/ffmpeg` |

Possible `status` values: `QUEUED`, `PROCESSING`, `SUCCESS`, `FAILED`.

---

### GET `/health`

```
GET /health
```

Returns API status, memory usage, Node.js version, and uptime.

---

## Project Structure

```
huoka-api/
├── api/
│   ├── lib/
│   │   └── helpers.js        # Shared CORS and response utilities
│   ├── index.js              # GET /
│   ├── yt-search.js          # GET /yt-search
│   ├── yt-song.js            # GET /yt-song
│   ├── yt-playlist.js        # GET /yt-playlist
│   ├── yt-mp3.js             # GET /yt-mp3
│   ├── ffmpeg.js             # POST /ffmpeg
│   ├── ffmpeg-status.js      # GET /ffmpeg-status
│   └── health.js             # GET /health
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

---

## Adding a New Endpoint

Create a new file in `api/`. It is automatically available as a route with no additional configuration.

```js
// api/my-endpoint.js
const { setCors, sendSuccess, sendError } = require("./lib/helpers");

module.exports = async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "GET") return sendError(res, "Method not allowed", 405);

  return sendSuccess(res, { result: "ok" });
};
```

The above becomes accessible at `https://api.huoka.eu.org/my-endpoint`.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RENDI_API_KEY` | API key for [Rendi](https://rendi.dev) — required for `/ffmpeg` and `/ffmpeg-status` |

Set via Vercel dashboard (Settings → Environment Variables) or CLI:

```bash
vercel env add RENDI_API_KEY
```

---

## License

MIT
