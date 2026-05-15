---
name: ai-integration
description: Work on AI/LLM integration in DiaLogicNgine via OffloadMQ. Use when adding new AI-powered features, new capability types, new backend AI routes, or modifying the LLM/imggen prompts and parsing.
---

# AI Integration Skill

## What is OffloadMQ?

[OffloadMQ](../../../offload/offloadmq) is a distributed task queue for offloading heavy computation to remote agent nodes. DiaLogicNgine's backend uses it as a gateway for all AI tasks (LLM text generation, image generation).

**Architecture**: Client (our backend) → OffloadMQ Server → Agent (runs Ollama / Stable Diffusion / etc.)

The server runs at `https://offloadmq.alexgr.space` (configured in `backend/.env`).

---

## Configuration

All credentials live in `backend/.env`:

```
OFFLOADMQ_URL=https://offloadmq.alexgr.space
OFFLOADMQ_API_KEY=<client key>
```

Both backend modules load them the same way:

```python
load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")
OFFLOADMQ_URL = os.getenv("OFFLOADMQ_URL", "").rstrip("/")
OFFLOADMQ_API_KEY = os.getenv("OFFLOADMQ_API_KEY", "")
```

Always call `_check_config()` at the start of every route handler to return HTTP 503 when misconfigured.

---

## Capabilities

Each agent registers with a set of **capability strings**. Tasks are routed to agents that have the matching capability.

| Capability prefix | What runs it | Example |
|---|---|---|
| `llm.*` | Ollama on the agent node | `llm.dolphin-mistral`, `llm.llama3` |
| `imggen.*` | Stable Diffusion / ComfyUI | `imggen.flux-dev` |
| `debug.*` | Echo/test agents | `debug.echo` |
| `shell.*` | Shell execution on agent | `shell.bash` |
| `tts.*` | Text-to-speech | `tts.kokoro` |

For LLM capabilities the model name after the dot matches the Ollama model name exactly (e.g. `llm.dolphin-mistral` → Ollama model `dolphin-mistral`).

### Discovering online capabilities

```python
async with httpx.AsyncClient(timeout=10) as client:
    r = await client.post(
        f"{OFFLOADMQ_URL}/api/capabilities/online",
        json={"apiKey": OFFLOADMQ_API_KEY},
    )
caps: list[str] = r.json()
llm_caps  = [c for c in caps if c.startswith("llm.")]
img_caps  = [c for c in caps if c.startswith("imggen.")]
```

---

## Task Submission: Two Modes

### Urgent (blocking) — use for LLM text generation

Submits the task and **blocks until the agent finishes** (up to `timeout` seconds). Returns the full task result in one response. Max practical timeout: 120 s for LLM, 300 s for heavy models.

```python
async with httpx.AsyncClient(timeout=120) as client:
    r = await client.post(
        f"{OFFLOADMQ_URL}/api/task/submit_blocking",
        json={
            "capability": "llm.dolphin-mistral",
            "urgent": True,
            "restartable": False,
            "payload": { ... },   # capability-specific, see below
            "apiKey": OFFLOADMQ_API_KEY,
        },
    )
data = r.json()
```

**Response shape** (urgent/blocking):
```json
{
  "result": {
    "message": { "role": "assistant", "content": "<LLM text>" },
    "model": "dolphin-mistral",
    "done": true
  }
}
```

Extract content:
```python
result  = data.get("result") or data.get("output") or {}
message = result.get("message", {})
content = message.get("content", "")
```

### Non-urgent (async) — use for image generation

Returns immediately with a task ID. The client must poll for status.

```python
# Submit
r = await client.post(
    f"{OFFLOADMQ_URL}/api/task/submit",
    json={
        "capability": req.model,        # e.g. "imggen.flux-dev"
        "urgent": False,
        "outputBucket": output_bucket,  # pre-created bucket UID
        "payload": { ... },
        "apiKey": OFFLOADMQ_API_KEY,
    },
)
data = r.json()
cap = data["id"]["cap"]
tid = data["id"]["id"]

# Poll
r = await client.post(
    f"{OFFLOADMQ_URL}/api/task/poll/{cap}/{tid}",
    json={"apiKey": OFFLOADMQ_API_KEY},
)
status_data = r.json()   # {"status": "pending|assigned|completed|failed", ...}
```

---

## LLM Payload Format

The agent's `execute_llm_query` expects an Ollama-compatible chat payload:

```json
{
  "model": "dolphin-mistral",
  "stream": false,
  "messages": [
    { "role": "system", "content": "<system prompt>" },
    { "role": "user",   "content": "<user prompt>" }
  ]
}
```

The `model` field inside `payload` is the bare Ollama model name (no `llm.` prefix). Strip it with:
```python
model = capability.removeprefix("llm.")
```

Optional Ollama parameters that the agent forwards: `temperature`, `top_p`, `top_k`, `seed`, `num_predict`, `stop`, `repeat_penalty`, `num_ctx`.

---

## Image Generation Payload Format

```json
{
  "workflow": "txt2img",
  "prompt": "<text prompt>",
  "resolution": { "width": 1024, "height": 1024 }
}
```

Image gen requires an **output bucket** (pre-created storage slot) and uses non-urgent submission. The agent writes the generated image into the bucket; the backend then downloads it, saves it to the project storage, and deletes the bucket.

### Bucket lifecycle

```python
# 1. Create bucket
bucket_r = await client.post(
    f"{OFFLOADMQ_URL}/api/storage/bucket/create",
    headers={"X-API-Key": OFFLOADMQ_API_KEY},
    json={},
)
output_bucket = bucket_r.json()["bucket_uid"]

# 2. Submit task with outputBucket
# 3. On completion, download:
dl = await client.get(
    f"{OFFLOADMQ_URL}/api/storage/bucket/{bucket_uid}/file/{file_uid}",
    headers={"X-API-Key": OFFLOADMQ_API_KEY},
)

# 4. Delete bucket (best-effort)
await client.delete(
    f"{OFFLOADMQ_URL}/api/storage/bucket/{output_bucket}",
    headers={"X-API-Key": OFFLOADMQ_API_KEY},
)
```

The `images` array in the completed task output:
```json
{
  "output": {
    "images": [
      { "file_uid": "...", "bucket_uid": "...", "filename": "output.png" }
    ]
  }
}
```

---

## Existing Backend Modules

### `backend/app/api/v1/llm.py` — LLM dialog generation

Routes under `/api/v1/llm/`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/llm/models` | List online `llm.*` capabilities |
| `POST` | `/llm/generate-dialog` | Submit urgent LLM task → parse JSON array of dialog window stubs |

Request body:
```json
{ "capability": "llm.dolphin-mistral", "prompt": "A shopkeeper haggling..." }
```

Response: array of dialog window stubs `[{ "uid": "...", "text": "...", "links": [...] }]`.

The system prompt instructs the LLM to return a raw JSON array (no markdown fences). The backend strips fences anyway via `_extract_json_array()`.

### `backend/app/api/v1/offloadmq.py` — Image generation

Routes under `/api/v1/imggen/`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/imggen/models` | List online `imggen.*` capabilities |
| `POST` | `/imggen/generate` | Create bucket, submit non-urgent task, return `{cap, id, output_bucket}` |
| `GET` | `/imggen/status/{project}/{cap}/{task_id}/{bucket}` | Poll status; on completion download → save to project storage → delete bucket |

---

## The OpenAI-Compatible Proxy

`../offload/offloadmq/openai-api-proxy/proxy.py` runs on port **11434** (Ollama's default) and translates OpenAI-format requests into OffloadMQ tasks. It is **not** used by our backend directly — the backend calls OffloadMQ's client API directly.

The proxy is useful for testing with tools that speak the OpenAI protocol (e.g. OpenWebUI, Continue.dev).

---

## Adding a New AI Feature

1. **Identify the capability** — check `GET /api/v1/llm/models` (or `/imggen/models`) to confirm the agent is online.

2. **Decide urgency**:
   - Use `submit_blocking` for text tasks (result needed immediately, < 2 min).
   - Use `submit` + poll for anything that produces files or takes > 2 min.

3. **Create a backend route** in `backend/app/api/v1/<feature>.py` following the pattern in `llm.py`.
   - Load `.env` at module level.
   - `_check_config()` guard at top of each handler.
   - Use `httpx.AsyncClient` (never `requests` in async FastAPI).
   - Register the router in `backend/app/api/v1/router.py`.

4. **Frontend**: fetch from `/api/v1/<feature>/...` — the Vite dev proxy forwards `/api/` to `localhost:8000`.

---

## Error Handling Conventions

```python
if r.status_code != 200:
    raise HTTPException(status_code=r.status_code, detail=r.text)

result = data.get("result") or data.get("output") or {}
if not result:
    raise HTTPException(status_code=502, detail="Agent returned empty result")
```

For non-urgent tasks, `status` can be `"pending"`, `"assigned"`, `"completed"`, `"failed"`, or `"canceled"`. Only `"completed"` means the output is usable.

---

## Parsing LLM JSON Output

LLMs sometimes wrap JSON in markdown code fences. Always strip them:

```python
import json, re

def _extract_json_array(text: str) -> list:
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    start = text.find("[")
    end   = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("No JSON array found in LLM response")
    return json.loads(text[start:end + 1])
```

When designing prompts for structured output, always say: **"Return ONLY valid JSON — no markdown, no code fences, no explanation."**
