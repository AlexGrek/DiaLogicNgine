import { generateImageUrl } from "../../Utils"

type Purpose = "scene" | "lookahead"
type Outcome = "loaded" | "error" | "timeout"
type LogEntry = { sequence: number, url: string, purpose: Purpose, status: "started" | Outcome }
type ImageUris = (string | null | undefined)[]

const MAX_LOOKAHEAD = 4
const REQUEST_TIMEOUT_MS = 6000
const LOG_LIMIT = 256
const CACHE_LIMIT = 24

/** Owned by a single mounted game/project. The browser renders these same URLs. */
export class PlayerImagePreloader {
    private active = new Map<string, { ready: Promise<void>, image: HTMLImageElement, cancel: () => void }>()
    private completed = new Map<string, { outcome: Outcome, purpose: Purpose, image?: HTMLImageElement }>()
    // Evict decoded images freely without repeatedly speculating on large sets of variants.
    private attempted = new Set<string>()
    private queue: string[] = []
    private log: LogEntry[] = []
    private sequence = 0
    private disposed = false

    constructor(private project: string, private input: HTMLInputElement) {
        this.publish()
    }

    private publish() {
        this.input.value = JSON.stringify({
            project: this.project, pending: this.active.size, queued: this.queue.length, entries: this.log,
        })
    }

    private record(url: string, purpose: Purpose, status: LogEntry["status"]) {
        if (this.log.length === LOG_LIMIT) this.log.shift()
        this.log.push({ sequence: ++this.sequence, url, purpose, status })
        this.publish()
    }

    private urls(uris: ImageUris) {
        return [...new Set(uris.flatMap(uri => uri?.trim() ? [generateImageUrl(uri, this.project)] : []))]
    }

    prepare(scene: ImageUris, lookahead: ImageUris) {
        // A new position supersedes queued guesses. Keep useful in-flight requests.
        const required = this.urls(scene).map(url => this.load(url, "scene"))
        this.queue = this.urls(lookahead).filter(url => !this.attempted.has(url))
        this.pump()
        this.publish()
        return Promise.all(required)
    }

    private pump() {
        while (!this.disposed && this.active.size < MAX_LOOKAHEAD && this.queue.length) {
            const url = this.queue.shift()!
            void this.load(url, "lookahead")
        }
    }

    private load(url: string, purpose: Purpose): Promise<void> {
        const pending = this.active.get(url)
        if (pending) {
            if (purpose === "scene") pending.image.fetchPriority = "high"
            return pending.ready
        }
        const previous = this.completed.get(url)
        // Give a failed speculative request one more chance when the scene needs it.
        if (previous && (previous.outcome === "loaded" || previous.purpose === "scene" || purpose === "lookahead")) {
            this.completed.delete(url)
            this.completed.set(url, previous)
            return Promise.resolve()
        }

        this.attempted.add(url)
        const image = new Image()
        let resolve!: () => void
        const ready = new Promise<void>(done => { resolve = done })
        const finish = (outcome?: Outcome) => {
            if (this.active.get(url)?.ready !== ready) return
            clearTimeout(timer)
            image.onload = image.onerror = null
            this.active.delete(url)
            if (outcome === "timeout" || !outcome) image.removeAttribute("src")
            if (outcome) {
                // Retain recent images so a subsequent <img> or CSS background can reuse them.
                this.completed.delete(url)
                this.completed.set(url, { outcome, purpose, image: outcome === "loaded" ? image : undefined })
                if (this.completed.size > CACHE_LIMIT) {
                    const oldest = this.completed.keys().next().value
                    if (oldest !== undefined) this.completed.delete(oldest)
                }
                this.record(url, purpose, outcome)
            }
            resolve()
            this.pump()
        }
        const timer = window.setTimeout(() => finish("timeout"), REQUEST_TIMEOUT_MS)
        this.active.set(url, { ready, image, cancel: () => finish() })
        this.record(url, purpose, "started")
        image.onload = () => {
            if (image.decode) {
                void image.decode().then(() => finish("loaded"), () => finish("error"))
            } else {
                finish("loaded")
            }
        }
        image.onerror = () => finish("error")
        image.fetchPriority = purpose === "scene" ? "high" : "low"
        image.src = url
        return ready
    }

    dispose() {
        this.disposed = true
        this.queue = []
        for (const request of this.active.values()) request.cancel()
        this.completed.clear()
        this.attempted.clear()
    }
}
