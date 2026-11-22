# syntax=docker/dockerfile:1.7
# Build context: repo root
# Frontend and player-runner must be built on the host before running docker build
# (dialogic/dist/ and player-runner/dist/runner.mjs are copied in).
# Target platform is always linux/amd64 — passed via docker buildx --platform flag.

ARG TARGETPLATFORM=linux/amd64
FROM --platform=$TARGETPLATFORM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

WORKDIR /app

# Install dependencies in a separate layer for caching
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-cache

# Copy backend source
COPY backend/ ./

# Copy pre-built headless Deno player runner (built on host via: cd player-runner && npm run build)
COPY player-runner/dist/runner.mjs ./player-runner/dist/runner.mjs

# Copy pre-built frontend (built on host via: cd dialogic && npm run build)
COPY dialogic/dist/ ./static/

EXPOSE 8000
ENV HOST=0.0.0.0
ENV PORT=8000
ENV STATIC_DIR=/app/static
ENV PLAY_MCP_RUNNER_PATH=/app/player-runner/dist/runner.mjs

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
