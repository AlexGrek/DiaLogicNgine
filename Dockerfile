# syntax=docker/dockerfile:1.7
# Build context: repo root
# Frontend must be built on the host before running docker build (dialogic/dist/ is copied in).
# Target platform is always linux/amd64 — passed via docker buildx --platform flag.

ARG TARGETPLATFORM=linux/amd64
FROM --platform=$TARGETPLATFORM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies in a separate layer for caching
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-cache

# Copy backend source
COPY backend/ ./

# Copy pre-built frontend (built on host via: cd dialogic && npm run build)
COPY dialogic/dist/ ./static/

EXPOSE 8000
ENV HOST=0.0.0.0
ENV PORT=8000
ENV STATIC_DIR=/app/static

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
