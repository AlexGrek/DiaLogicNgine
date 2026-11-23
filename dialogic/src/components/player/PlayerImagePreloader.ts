import { generateImageUrl } from "../../Utils"

type Purpose = "scene" | "lookahead"
type Outcome = "loaded" | "error" | "timeout"
type LogEntry = { sequence: number, url: string, purpose: Purpose, status: "started" | Outcome }
type ImageUris = (string | null | undefined)[]

const MAX_LOOKAHEAD = 4
const REQUEST_TIMEOUT_MS = 6000
const LOG_LIMIT = 256

/** Owned by a single mounted game/project. The browser renders these same URLs. */
export class PlayerImagePreloader {
    private active = new Map<string, { ready: Promise<void>, cancel: () => void }>()
    private completed = new Map<string, { outcome: Outcome, purpose: Purpose }>()
    private queue: string[] = []
    private log: LogEntry[] = []
    private sequence = 0
    private disposed = false

    constructor(private project: string, private input: HTMLInputElement) {
        this.publish()
    }

    private publish() {
        this.input.value = JSON.stringify({ project: this.project, entries: this.log })
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
        this.queue = this.urls(lookahead).filter(url => !this.completed.has(url) && !this.active.has(url))
        this.pump()
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
        if (pending) return pending.ready
        const previous = this.completed.get(url)
        // Give a failed speculative request one more chance when the scene needs it.
        if (previous && (previous.outcome === "loaded" || previous.purpose === "scene" || purpose === "lookahead")) {
            return Promise.resolve()
        }

        const image = new Image()
        let resolve!: () => void
        const ready = new Promise<void>(done => { resolve = done })
        const finish = (outcome?: Outcome) => {
            clearTimeout(timer)
            image.onload = image.onerror = null
            if (!this.active.delete(url)) return
            if (outcome === "timeout" || !outcome) image.removeAttribute("src")
            if (outcome) {
                this.completed.set(url, { outcome, purpose })
                this.record(url, purpose, outcome)
            }
            resolve()
            this.pump()
        }
        const timer = window.setTimeout(() => finish("timeout"), REQUEST_TIMEOUT_MS)
        this.active.set(url, { ready, cancel: () => finish() })
        this.record(url, purpose, "started")
        image.onload = () => finish("loaded")
        image.onerror = () => finish("error")
        image.fetchPriority = purpose === "scene" ? "high" : "low"
        image.src = url
        return ready
    }

    dispose() {
        this.disposed = true
        this.queue = []
        for (const request of this.active.values()) request.cancel()
    }
}
