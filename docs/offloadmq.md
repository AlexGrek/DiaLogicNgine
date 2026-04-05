# OffloadMQ Integration

OffloadMQ is the remote task queue used for AI image generation. The backend acts as a thin proxy — it submits tasks, polls for results, and saves completed images locally.

## Configuration

Add to `backend/.env`:

```
OFFLOADMQ_URL=https://your-offloadmq-host
OFFLOADMQ_API_KEY=your-api-key
```

The module loads these at startup via `python-dotenv`. If either value is missing, all imggen routes return `503`.

## API routes (`/api/v1/imggen/`)

### `GET /models`

Returns the list of `imggen.*` capabilities currently online.

Calls `POST {OFFLOADMQ_URL}/api/capabilities/online` and filters results to names starting with `imggen.`.

**Response:** `["imggen.flux-dev", "imggen.flux-krea", ...]`

---

### `POST /generate`

Submits a txt2img task. Returns a task reference used for polling.

**Request body:**
```json
{
  "project_name": "my-project",
  "model": "imggen.flux-krea",
  "prompt": "a forest at night",
  "width": 1024,
  "height": 1024
}
```

**Flow:**
1. Creates an OffloadMQ output bucket (`POST /api/storage/bucket/create`) — gets back `bucket_uid`.
2. Submits the task (`POST /api/task/submit`) with `capability`, `outputBucket`, and a `txt2img` payload.
3. Returns task reference to the frontend.

**Response:**
```json
{ "cap": "imggen.flux-krea", "id": "01KNEKRYMX69...", "output_bucket": "abc123" }
```

---

### `GET /status/{project_name}/{cap}/{task_id}/{output_bucket}`

Polls task status. The frontend calls this every 3 seconds until done or failed.

**OffloadMQ poll endpoint:** `POST /api/task/poll/{cap}/{task_id}`

**While running**, returns:
```json
{
  "status": "running",
  "log": "Queued as prompt_id=...",
  "avg_time": 33.226
}
```

`avg_time` is extracted from the OffloadMQ field `typicalRuntimeSeconds: { secs, nanos }` and expressed as a float in seconds. The frontend uses this to drive a progress bar.

**On completion**, the backend:
1. Downloads the first image from the output bucket (`GET /api/storage/bucket/{bucket_uid}/file/{file_uid}`).
2. Saves it to `storage/projects/{project_name}/images/generated_{timestamp}{ext}`.
3. Generates a 256px thumbnail into `storage/projects/{project_name}/image_thumbs/`.
4. Deletes the OffloadMQ bucket (best-effort).
5. Returns `{ "status": "completed", "filename": "generated_1234567890.png" }`.

**On failure**, returns `{ "status": "failed", "error": "..." }`.

## OffloadMQ API conventions

- Auth: `X-API-Key` header for storage endpoints; `apiKey` in JSON body for task endpoints.
- Task submit uses camelCase: `outputBucket`, `apiKey`.
- Poll response uses camelCase: `typicalRuntimeSeconds`, `createdAt`, `stage`.
- Storage bucket and file UIDs come from the task output: `output.images[0].bucket_uid` / `output.images[0].file_uid`.

## Frontend flow

```
handleGenerate()
  → POST /api/v1/imggen/generate
  → sets status='polling', records pollStart = Date.now()

polling loop (every 3s)
  → GET /api/v1/imggen/status/...
  → if avg_time received → drives progress bar via requestAnimationFrame
  → if completed → saves filename, status='done'
  → if failed    → status='error'
```

The progress bar uses an exponential easing curve (`1 - e^(-2.5 * elapsed/avgMs)`) that approaches 95% asymptotically, snapping to 100% on completion.

## Adding a new imggen model

No code changes needed — models are discovered dynamically from the OffloadMQ `/api/capabilities/online` endpoint. Any capability whose name starts with `imggen.` appears in the model picker automatically.

The task payload `workflow: "txt2img"` and `resolution: { width, height }` are fixed for now. If a new model requires a different payload shape, extend `GenerateRequest` and the submit body in `offloadmq.py`.
