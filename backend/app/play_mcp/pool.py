"""Per-session isolated Deno worker pool with timeout, LRU cap, and idle TTL eviction."""

import asyncio
import json
import os
import shutil
import time
from collections import OrderedDict
from collections.abc import Callable
from pathlib import Path

TURN_TIMEOUT_SECONDS = float(os.getenv("PLAY_MCP_TURN_TIMEOUT", "5.0"))
IDLE_TTL_SECONDS = float(os.getenv("PLAY_MCP_IDLE_TTL", "600.0"))
MAX_WORKERS = int(os.getenv("PLAY_MCP_MAX_WORKERS", "16"))
V8_MAX_OLD_SPACE_MB = int(os.getenv("PLAY_MCP_V8_MAX_MB", "64"))
STREAM_LIMIT_BYTES = 16 * 1024 * 1024


def resolve_runner_path() -> Path:
    configured = os.getenv("PLAY_MCP_RUNNER_PATH", "").strip()
    if configured:
        path = Path(configured).resolve()
        if path.is_file():
            return path
        raise RuntimeError(f"Configured PLAY_MCP_RUNNER_PATH does not exist: {path}")

    here = Path(__file__).resolve()
    candidates = [
        here.parents[3] / "player-runner" / "dist" / "runner.mjs",  # repo layout
        here.parents[2] / "player-runner" / "dist" / "runner.mjs",  # container /app layout
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise RuntimeError(
        "player-runner bundle not found. Run `cd player-runner && npm run build` first."
    )


def resolve_deno_bin() -> str:
    configured = os.getenv("PLAY_MCP_DENO_BIN", "").strip()
    if configured:
        return configured
    found = shutil.which("deno")
    if found:
        return found
    raise RuntimeError("Deno binary not found on PATH (set PLAY_MCP_DENO_BIN or install deno)")


class DenoWorker:
    """Single isolated Deno subprocess running one game session."""

    def __init__(self, project: str):
        self.project = project
        self.proc: asyncio.subprocess.Process | None = None
        self._stderr_task: asyncio.Task | None = None
        self._stderr_tail: list[str] = []
        self._next_id = 0
        self.last_used = time.monotonic()
        self.dead = False

    @property
    def alive(self) -> bool:
        return not self.dead and self.proc is not None and self.proc.returncode is None

    async def start(self) -> None:
        deno_bin = resolve_deno_bin()
        runner_path = resolve_runner_path()
        # Zero Deno permissions (--no-prompt, --no-remote, --no-npm, no --allow-* flags).
        self.proc = await asyncio.create_subprocess_exec(
            deno_bin,
            "run",
            "--no-prompt",
            "--no-remote",
            "--no-npm",
            f"--v8-flags=--max-old-space-size={V8_MAX_OLD_SPACE_MB}",
            str(runner_path),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            limit=STREAM_LIMIT_BYTES,
        )
        self._stderr_task = asyncio.create_task(self._drain_stderr())
        self.last_used = time.monotonic()

    async def _drain_stderr(self) -> None:
        if not self.proc or not self.proc.stderr:
            return
        try:
            while True:
                line = await self.proc.stderr.readline()
                if not line:
                    break
                text = line.decode("utf-8", errors="replace").rstrip()
                if text:
                    self._stderr_tail.append(text)
                    if len(self._stderr_tail) > 20:
                        self._stderr_tail.pop(0)
        except Exception:
            pass

    async def call(self, op: str, timeout: float | None = None, **params) -> dict:
        if not self.alive or not self.proc or not self.proc.stdin or not self.proc.stdout:
            raise RuntimeError("Game worker process is not running")

        self._next_id += 1
        req_id = self._next_id
        payload = json.dumps({"id": req_id, "op": op, **params}, ensure_ascii=False, separators=(",", ":")) + "\n"
        effective_timeout = TURN_TIMEOUT_SECONDS if timeout is None else timeout

        try:
            self.proc.stdin.write(payload.encode("utf-8"))
            await asyncio.wait_for(self.proc.stdin.drain(), timeout=effective_timeout)
            raw_line = await asyncio.wait_for(self.proc.stdout.readline(), timeout=effective_timeout)
        except asyncio.TimeoutError:
            await self.close(force=True)
            raise RuntimeError(
                f"Game script timed out after {effective_timeout:.1f}s; worker was terminated and saved state is preserved"
            ) from None
        except Exception as exc:
            await self.close(force=True)
            raise RuntimeError(f"Communication with game worker failed: {exc}") from None

        if not raw_line:
            tail = " | ".join(self._stderr_tail[-3:])
            await self.close(force=True)
            detail = f" ({tail})" if tail else ""
            raise RuntimeError(f"Game worker exited unexpectedly{detail}")

        try:
            response = json.loads(raw_line.decode("utf-8"))
        except Exception as exc:
            await self.close(force=True)
            raise RuntimeError(f"Malformed response from game worker: {exc}") from None

        self.last_used = time.monotonic()
        if not response.get("ok"):
            raise ValueError(response.get("error") or "Game engine error")
        return response["result"]

    async def close(self, *, force: bool = False) -> None:
        self.dead = True
        proc = self.proc
        self.proc = None
        if proc is not None:
            if proc.stdin and not proc.stdin.is_closing():
                try:
                    proc.stdin.close()
                except Exception:
                    pass
            if proc.returncode is None:
                try:
                    if force:
                        proc.kill()
                    else:
                        proc.terminate()
                        try:
                            await asyncio.wait_for(proc.wait(), timeout=0.5)
                        except asyncio.TimeoutError:
                            proc.kill()
                except ProcessLookupError:
                    pass
                try:
                    await asyncio.wait_for(proc.wait(), timeout=1.0)
                except Exception:
                    pass
        if self._stderr_task is not None:
            self._stderr_task.cancel()
            try:
                await self._stderr_task
            except BaseException:
                pass
            self._stderr_task = None


class SessionProcessPool:
    """Manages isolated per-session Deno workers keyed by (owner, session_code)."""

    def __init__(self):
        self._workers: OrderedDict[tuple[str, str], DenoWorker] = OrderedDict()
        self._locks: dict[tuple[str, str], asyncio.Lock] = {}
        self._pool_lock = asyncio.Lock()

    def session_lock(self, owner: str, session_code: str) -> asyncio.Lock:
        key = (owner, session_code)
        lock = self._locks.get(key)
        if lock is None:
            lock = asyncio.Lock()
            self._locks[key] = lock
        return lock

    def is_active(self, owner: str, session_code: str) -> bool:
        worker = self._workers.get((owner, session_code))
        return worker is not None and worker.alive

    async def evict_idle(self) -> int:
        now = time.monotonic()
        stale: list[DenoWorker] = []
        async with self._pool_lock:
            for key, worker in list(self._workers.items()):
                if not worker.alive or (now - worker.last_used) > IDLE_TTL_SECONDS:
                    stale.append(self._workers.pop(key))
        for worker in stale:
            await worker.close()
        return len(stale)

    async def _evict_if_full(self) -> None:
        evicted: list[DenoWorker] = []
        async with self._pool_lock:
            while len(self._workers) >= MAX_WORKERS:
                _, oldest = self._workers.popitem(last=False)
                evicted.append(oldest)
        for worker in evicted:
            await worker.close()

    async def spawn_new(
        self, project: str, game: dict, *, op: str = "init", **params
    ) -> tuple[DenoWorker, dict]:
        """Spawn and initialize a brand-new Deno worker before persisting its session.

        ``op`` is ``init`` for a normal start, or ``debug_init`` for a developer start
        (initial state without running the startup entry).
        """
        await self.evict_idle()
        await self._evict_if_full()
        worker = DenoWorker(project)
        await worker.start()
        try:
            if op == "init":
                params.setdefault("state", None)
            result = await worker.call(op, game=game, **params)
        except Exception:
            await worker.close(force=True)
            raise
        return worker, result

    async def register(self, owner: str, session_code: str, worker: DenoWorker) -> None:
        key = (owner, session_code)
        old: DenoWorker | None = None
        async with self._pool_lock:
            old = self._workers.pop(key, None)
            self._workers[key] = worker
            self._workers.move_to_end(key)
        if old is not None:
            await old.close()

    async def ensure_worker(
        self,
        owner: str,
        session_code: str,
        project: str,
        game_loader: Callable[[], dict],
        state_loader: Callable[[], dict],
    ) -> tuple[DenoWorker, dict | None]:
        """Return an active worker for (owner, session_code), rehydrating from DB if needed.

        Returns (worker, init_result_if_rehydrated).
        """
        await self.evict_idle()
        key = (owner, session_code)
        async with self._pool_lock:
            existing = self._workers.get(key)
            if existing is not None and existing.alive:
                self._workers.move_to_end(key)
                return existing, None
            if existing is not None:
                self._workers.pop(key, None)

        await self._evict_if_full()
        game = game_loader()
        saved_state = state_loader()
        worker = DenoWorker(project)
        await worker.start()
        try:
            init_result = await worker.call("init", game=game, state=saved_state)
        except Exception:
            await worker.close(force=True)
            raise
        await self.register(owner, session_code, worker)
        return worker, init_result

    async def drop_if_dead(self, owner: str, session_code: str, worker: DenoWorker) -> None:
        if worker.alive:
            return
        key = (owner, session_code)
        async with self._pool_lock:
            if self._workers.get(key) is worker:
                self._workers.pop(key, None)

    async def close_session(self, owner: str, session_code: str) -> bool:
        key = (owner, session_code)
        async with self._pool_lock:
            worker = self._workers.pop(key, None)
            self._locks.pop(key, None)
        if worker is not None:
            await worker.close()
            return True
        return False

    async def shutdown(self) -> None:
        async with self._pool_lock:
            workers = list(self._workers.values())
            self._workers.clear()
            self._locks.clear()
        for worker in workers:
            await worker.close()


pool = SessionProcessPool()
