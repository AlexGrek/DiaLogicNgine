/**
 * Deep static verification of a raw game.json (before migration).
 *
 * A TypeScript port of .claude/skills/game_json/scripts/validate_game.py: dangling
 * uid references, malformed quest paths, undeclared props/facts/items/quests used
 * by scripts, unreachable windows, dead ends and structural mistakes that only
 * surface when a player walks into them. It complements `runSanityCheck`
 * (sanityCheck.ts), which works on the migrated model and also checks images.
 *
 * Pure: no DOM, no Node. Used by the `dialogic verify` CLI command.
 */
import { ENGINE_VERSION } from "./GameDescription"

export type VerifySeverity = "error" | "warning"

export interface VerifyIssue {
    severity: VerifySeverity
    where: string
    message: string
}

export interface VerifyOptions {
    /**
     * Compile-check one script; return an error message or null. Scripts are
     * function bodies with the given parameter list. Omit to skip syntax checks.
     */
    checkSyntax?: (params: string, source: string) => string | null
}

export interface ScriptLeaf {
    /** Dotted path, e.g. dialogs[0].windows[2].entryScript */
    path: string
    /** RFC 6901 pointer into the game JSON. */
    pointer: string
    source: string
    /** Parameter list the engine compiles this script with. */
    params: string
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const REQUIRED_KEYS = [
    "engineVersion", "buildVersion", "general", "startupDialog", "startMenu",
    "config", "dev", "visuals", "translations", "dialogs", "chars", "roles",
    "locs", "props", "facts", "items", "objectives", "events", "eventHosts",
    "situations", "pacWidgets", "uiElements", "hooks", "functions",
]

const LINK_TYPES = new Set(["local", "push", "pop", "jump", "resetjump", "tolocation", "toperson", "reply", "return"])
const QUALIFIED_TYPES = new Set(["push", "jump", "resetjump"])
const PROP_DATATYPES = new Set(["number", "string", "boolean", "variant", "location"])

export const SCRIPT_KEYS = new Set([
    "actionCode", "isVisible", "isEnabled", "useAlternativeWhen",
    "textProcessingCode", "body", "onComplete", "onFail", "onOpen", "value",
])
const OBJECTIVE_METHODS = new Set(["open", "close", "complete", "fail", "status", "isCompleted", "isFailed", "isOpen"])

/** Parameters every game script is compiled with (Runtime.ts makeFunctionBody). */
export const SCRIPT_PARAMS = "rt, state, props, ch, facts, objectives, situation, items, context"

export function isScriptKey(key: string): boolean {
    return SCRIPT_KEYS.has(key) || key.endsWith("Script")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any

const isObj = (v: unknown): v is Record<string, J> => typeof v === "object" && v !== null && !Array.isArray(v)
const arr = (v: unknown): J[] => (Array.isArray(v) ? v : [])
const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v))
const escTok = (s: string) => s.replace(/~/g, "~0").replace(/\//g, "~1")

/** Every non-empty script string in the game, in document order. */
export function collectScriptLeaves(game: unknown): ScriptLeaf[] {
    const out: ScriptLeaf[] = []
    const walk = (value: unknown, path: string, pointer: string) => {
        if (Array.isArray(value)) {
            value.forEach((item, i) => walk(item, `${path}[${i}]`, `${pointer}/${i}`))
        } else if (isObj(value)) {
            for (const [k, v] of Object.entries(value)) {
                const here = path ? `${path}.${k}` : k
                const ptr = `${pointer}/${escTok(k)}`
                if (typeof v === "string") {
                    if (isScriptKey(k) && v.trim()) {
                        const params = k === "body" && typeof value.args === "string" ? value.args : SCRIPT_PARAMS
                        out.push({ path: here, pointer: ptr, source: v, params })
                    }
                } else {
                    walk(v, here, ptr)
                }
            }
        }
    }
    walk(game, "", "")
    return out
}

function dupes(names: unknown[]): string[] {
    const seen = new Set<unknown>()
    const dup: string[] = []
    for (const n of names) {
        if (n === undefined || n === null) continue
        if (seen.has(n) && !dup.includes(String(n))) dup.push(String(n))
        seen.add(n)
    }
    return dup
}

const pyRepr = (v: unknown) => JSON.stringify(v)

export function verifyGame(game: unknown, options: VerifyOptions = {}): VerifyIssue[] {
    const issues: VerifyIssue[] = []
    const error = (where: string, message: string) => issues.push({ severity: "error", where, message })
    const warn = (where: string, message: string) => issues.push({ severity: "warning", where, message })

    if (!isObj(game)) {
        error("(root)", "game JSON must be an object")
        return issues
    }

    // ── Top-level shape ──
    const version = game.engineVersion
    const outdated = typeof version === "string" && version !== ENGINE_VERSION
    for (const key of REQUIRED_KEYS) {
        if (!(key in game)) {
            if (outdated) {
                warn("(root)", `missing top-level key "${key}" — the loader will add it when migrating from engineVersion ${version} to ${ENGINE_VERSION}`)
            } else {
                error("(root)", `missing required top-level key "${key}"`)
            }
        }
    }
    if (typeof version !== "string") {
        error("(root)", `engineVersion must be a string (e.g. "${ENGINE_VERSION}") — the game will not load without it`)
    }

    const dialogs = arr(game.dialogs)
    const chars = arr(game.chars)
    const roles = arr(game.roles)
    const locs = arr(game.locs)
    const props = arr(game.props)
    const facts = arr(game.facts)
    const items = arr(game.items)
    const objectives = arr(game.objectives)
    const events = arr(game.events)
    const pacs = arr(game.pacWidgets)
    const hooks = arr(game.hooks)
    const functions = arr(game.functions)
    const situations = new Set(arr(game.situations))
    const eventHosts = new Set(arr(game.eventHosts))
    const meters = arr(isObj(game.uiElements) ? game.uiElements.meters : [])

    // ── Lookup tables ──
    const windowsByDialog = new Map<string, Set<string>>()
    for (const d of dialogs) windowsByDialog.set(d?.name, new Set(arr(d?.windows).map((w) => w?.uid)))
    const charUids = new Set(chars.map((c) => c?.uid))
    const charsByUid = new Map(chars.filter(isObj).map((c) => [c.uid, c]))
    const charsWithDialog = new Set(chars.filter((c) => c?.dialog).map((c) => c.uid))
    const locUids = new Set(locs.map((l) => l?.uid))
    const itemUids = new Set(items.map((i) => i?.uid))
    const factUids = new Set(facts.map((f) => f?.uid))
    const propNames = new Set(props.map((p) => p?.name))
    const roleNames = new Set(roles.map((r) => r?.name))
    const pacIds = new Set(pacs.map((p) => p?.id))
    const lineIndex = new Map(objectives.map((q) => [q?.uid, q]))
    const questIndex = new Set<string>() // "line\u0000quest"
    const taskIndex = new Set<string>() // "line\u0000quest\u0000task"
    const key = (...parts: unknown[]) => parts.map(str).join("\u0000")
    const inbound = new Set<string>() // key(dialog, window)

    // ── Duplicates ──
    const dupTables: [string, unknown[]][] = [
        ["dialog name", dialogs.map((d) => d?.name)],
        ["character uid", chars.map((c) => c?.uid)],
        ["role name", roles.map((r) => r?.name)],
        ["location uid", locs.map((l) => l?.uid)],
        ["prop name", props.map((p) => p?.name)],
        ["fact uid", facts.map((f) => f?.uid)],
        ["item uid", items.map((i) => i?.uid)],
        ["point-and-click id", pacs.map((p) => p?.id)],
        ["questline uid", objectives.map((o) => o?.uid)],
        ["meter uid", meters.map((m) => m?.uid)],
        ["function name", functions.map((f) => f?.name)],
    ]
    for (const [label, names] of dupTables) {
        for (const d of dupes(names)) error("(root)", `duplicate ${label} "${d}"`)
    }
    for (const d of dialogs) {
        for (const dup of dupes(arr(d?.windows).map((w) => w?.uid))) {
            error(`dialog "${d?.name}"`, `duplicate window uid "${dup}"`)
        }
    }

    // ── Identifier-shaped uids ──
    for (const p of props) {
        if (!IDENT.test(str(p?.name))) warn("props", `prop name "${p?.name}" is not a JS identifier — rt.props.<name> will not work`)
    }
    for (const f of facts) {
        if (!IDENT.test(str(f?.uid))) warn("facts", `fact uid "${f?.uid}" is not a JS identifier — rt.facts.<uid> will not work`)
    }

    // ── Links ──
    const checkQualified = (qd: unknown, where: string, what: string) => {
        if (!isObj(qd) || !qd.dialog || !qd.window) {
            error(where, `${what} has no qualifiedDirection target set`)
            return
        }
        const d = qd.dialog, w = qd.window
        inbound.add(key(d, w))
        if (!windowsByDialog.has(d)) {
            error(where, `${what} points to missing dialog "${d}"`)
        } else if (!windowsByDialog.get(d)!.has(w)) {
            error(where, `${what} points to missing window "${w}" in dialog "${d}"`)
        }
    }

    const checkDirection = (direction: unknown, where: string, dialogName: string | null, what = "link") => {
        if (!isObj(direction)) {
            error(where, `${what} direction is not an object`)
            return
        }
        const t = direction.type
        if (!LINK_TYPES.has(t)) {
            error(where, `unknown link type "${t}" (expected one of ${[...LINK_TYPES].sort().join(", ")})`)
            return
        }
        const target = direction.direction
        if (t === "local") {
            if (!target) {
                warn(where, `${what} of type local has no target window`)
            } else if (dialogName === null) {
                warn(where, `local link "${target}" is used outside a dialog; it resolves against whatever dialog hosts it at runtime`)
            } else {
                inbound.add(key(dialogName, target))
                if (!(windowsByDialog.get(dialogName)?.has(target))) {
                    error(where, `local link points to missing window "${target}" in dialog "${dialogName}"`)
                }
            }
        } else if (QUALIFIED_TYPES.has(t)) {
            checkQualified(direction.qualifiedDirection, where, `${t} link`)
        } else if (t === "tolocation") {
            if (!target) warn(where, "location link has no target")
            else if (!locUids.has(target)) error(where, `location link points to missing location "${target}"`)
        } else if (t === "toperson") {
            if (!target) warn(where, "talk-to-person link has no target")
            else if (!charUids.has(target)) error(where, `talk-to-person link points to missing character "${target}"`)
            else if (!charsWithDialog.has(target)) {
                error(where, `talk-to-person link targets character "${target}", which has no \`dialog\` — the player would land on an empty screen`)
            }
        } else if (t === "reply") {
            if (!direction.replyText) warn(where, "quick-reply link has no replyText")
        }
    }

    const checkLink = (link: unknown, where: string, dialogName: string | null = null) => {
        if (!isObj(link)) {
            error(where, "link is not an object")
            return
        }
        checkDirection(link.mainDirection, where, dialogName)
        const alts = arr(link.alternativeDirections)
        alts.forEach((alt, i) => checkDirection(alt, `${where} → alternative ${i + 1}`, dialogName))
        if (link.useAlternativeWhen && alts.length === 0) warn(where, "useAlternativeWhen is set but alternativeDirections is empty")
        if (alts.length && !link.useAlternativeWhen && link.isAlternativeLink) warn(where, "isAlternativeLink is set but useAlternativeWhen is missing")
        const bg = link.changeLocationInBg
        if (bg && !locUids.has(bg)) error(where, `changeLocationInBg points to missing location "${bg}"`)
    }

    // ── Dialogs / windows ──
    for (const d of dialogs) {
        const dname = d?.name
        for (const w of arr(d?.windows)) {
            const where = `dialog "${dname}" → window "${w?.uid}"`
            let links = w?.links
            if (links === undefined || links === null) {
                error(where, "missing required field `links` (use [] for none)")
                links = []
            }
            arr(links).forEach((link, i) => checkLink(link, `${where} → link ${i + 1}`, dname))
            for (const field of ["text", "backgrounds", "tags"]) {
                if (!isObj(w) || !(field in w)) error(where, `missing required field \`${field}\``)
            }
            if (!isObj(w) || !("specialWidget" in w)) error(where, "missing required field `specialWidget` (use null)")
            if (arr(links).length === 0) warn(where, "window has no links — the player cannot leave it")
            const actor = w?.actor
            if (isObj(actor) && actor.character && !actor.currentCharacter && !charUids.has(actor.character)) {
                error(where, `actor references missing character "${actor.character}"`)
            }
            const stage = arr(w?.stage)
            if (stage.length > 3) warn(where, `stage lists ${stage.length} persons; only the first 3 are shown`)
            stage.forEach((slot, si) => {
                if (!isObj(slot) || slot.currentCharacter) return
                const cuid = slot.character
                const ch = charsByUid.get(cuid)
                if (!cuid) {
                    warn(where, `stage person ${si + 1} has no character`)
                } else if (!ch) {
                    error(where, `stage person ${si + 1} references missing character "${cuid}"`)
                } else {
                    const looks = isObj(ch.looks) ? ch.looks : {}
                    const look = slot.look
                    const named = new Set(arr(looks.list).filter((e) => e?.uri).map((e) => e.name))
                    const ok = look && look !== "main" ? named.has(look) : Boolean(looks.main)
                    if (!ok) error(where, `stage person "${cuid}" has no ${look ? `look "${look}"` : "default (main) look"} in \`looks\``)
                }
            })
            const bg = w?.changeLocationInBg
            if (bg && !locUids.has(bg)) error(where, `changeLocationInBg points to missing location "${bg}"`)
            const sit = w?.changeSituation
            if (sit) {
                if (!situations.has(sit)) warn(where, `changeSituation "${sit}" is not declared in \`situations\``)
                warn(where, "changeSituation is not applied by the engine — set state.situation from a script instead")
            }
            const sw = w?.specialWidget
            if (sw) {
                const s = String(sw)
                const sep = s.indexOf("::")
                const kind = sep >= 0 ? s.slice(0, sep) : s
                const wid = sep >= 0 ? s.slice(sep + 2) : ""
                if (kind !== "pac" || !wid) error(where, `specialWidget "${s}" is malformed (expected "pac::<id>")`)
                else if (!pacIds.has(wid)) error(where, `specialWidget points to missing point-and-click widget "${wid}"`)
            }
        }
    }

    // ── Locations ──
    for (const l of locs) {
        const where = `location "${l?.uid}"`
        arr(l?.links).forEach((link, i) => checkLink(link, `${where} → link ${i + 1}`))
        for (const r of arr(l?.routes)) {
            if (!locUids.has(r)) {
                error(`${where} → routes`, `route points to missing location "${r}"`)
            } else {
                const back = locs.find((x) => x?.uid === r)
                if (!arr(back?.routes).includes(l?.uid)) {
                    warn(`${where} → routes`, `route to "${r}" is one-way — "${r}" has no route back to "${l?.uid}"`)
                }
            }
        }
        for (const g of arr(l?.goto)) {
            if (!locUids.has(g)) error(`${where} → goto`, `goto points to missing location "${g}"`)
        }
        if (Array.isArray(l?.eventHosts)) {
            for (const h of l.eventHosts) {
                if (!eventHosts.has(h)) warn(where, `eventHost "${h}" is not declared in the top-level \`eventHosts\``)
            }
        }
    }

    // ── Characters ──
    for (const c of chars) {
        const where = `character "${c?.uid}"`
        for (const r of arr(c?.roles)) {
            if (!roleNames.has(r)) error(where, `references missing role "${r}"`)
        }
        const dialog = c?.dialog
        if (!dialog) continue
        arr(dialog.links).forEach((link, i) => checkLink(link, `${where} → dialog link ${i + 1}`))
        if (arr(dialog.links).length === 0) {
            warn(`${where} → dialog`, "conversation has no links — the player cannot leave it (add a pop or return link)")
        }
        if (Array.isArray(dialog.eventHosts)) {
            for (const h of dialog.eventHosts) {
                if (!eventHosts.has(h)) warn(where, `eventHost "${h}" is not declared in the top-level \`eventHosts\``)
            }
        }
        arr(dialog.behavior?.reactions).forEach((reaction, i) => {
            const rwhere = `${where} → reaction ${i + 1}`
            const trigger = isObj(reaction?.trigger) ? reaction.trigger : {}
            const kinds: [string, Set<unknown>][] = [["facts", factUids], ["chars", charUids], ["items", itemUids], ["places", locUids]]
            for (const [kind, known] of kinds) {
                for (const uid of arr(trigger[kind])) {
                    if (!known.has(uid)) error(rwhere, `trigger.${kind} references missing "${uid}"`)
                }
            }
            if (!kinds.some(([k]) => arr(trigger[k]).length > 0)) warn(rwhere, "reaction has no triggers — it can never match")
            if (reaction?.dialogWindow) checkQualified(reaction.dialogWindow, rwhere, "reaction window")
            else if (!reaction?.reply) warn(rwhere, "reaction has neither reply text nor dialogWindow")
        })
    }

    // ── Startup ──
    const su = game.startupDialog
    if (!isObj(su)) {
        error("(root)", "startupDialog is missing or not an object")
    } else {
        if (su.kind !== "window") error("startupDialog", 'kind must be "window"')
        checkQualified(su, "startupDialog", "startup dialog")
    }

    // ── Events ──
    const implicitHosts = new Set([...[...locUids].map((u) => `loc:${u}`), ...[...charUids].map((u) => `char:${u}`)])
    for (const e of events) {
        const where = `event "${e?.name}"`
        if (!e?.name) error("events", "event has no name (it is the key used by rt.history)")
        if (e?.link) checkQualified(e.link, where, "event link")
        else warn(where, "event has no link — firing it does nothing")
        const targets = arr(e?.targets)
        if (targets.length === 0) warn(where, "event has no targets — it can never fire")
        for (const t of targets) {
            if (!eventHosts.has(t) && !implicitHosts.has(t)) {
                error(where, `targets unknown event host "${t}" (declare it in \`eventHosts\`, or use loc:<uid> / char:<uid>)`)
            }
        }
        const prob = e?.probability
        if (typeof prob !== "number" || prob < 0 || prob > 100) warn(where, `probability ${pyRepr(prob)} is outside 0–100`)
        const hostedByLoc = locs.some((l) => Array.isArray(l?.eventHosts)
            && (l.eventHosts.some((h: unknown) => targets.includes(h)) || targets.includes(`loc:${l?.uid}`)))
        if (targets.length && !hostedByLoc) {
            warn(where, "no location hosts any of this event's targets — events only roll on location entry, so it can never fire")
        }
    }

    // ── Point-and-click ──
    for (const pac of pacs) {
        for (const z of arr(pac?.zones)) {
            const where = `point-and-click "${pac?.id}" → zone "${z?.name || z?.id}"`
            for (const field of ["x", "y", "width", "height"]) {
                const v = z?.[field]
                if (typeof v !== "number") error(where, `\`${field}\` must be a number (percent of the screen)`)
                else if (v < 0 || v > 100) warn(where, `\`${field}\` = ${v} is outside 0–100 (values are percentages)`)
            }
            const md = z?.mainDirection
            if (md) checkDirection(md, `${where} → click`, null, "zone")
            arr(z?.alternativeDirections).forEach((alt, i) => checkDirection(alt, `${where} → alternative ${i + 1}`, null, "zone"))
            if (!md && !z?.onClickScript) warn(where, "zone neither navigates nor runs a script — clicking does nothing")
        }
        if (Array.isArray(pac?.eventHosts)) {
            for (const h of pac.eventHosts) {
                if (!eventHosts.has(h)) warn(`point-and-click "${pac?.id}"`, `eventHost "${h}" is not declared in the top-level \`eventHosts\``)
            }
        }
    }

    // ── Props ──
    const checkProp = (p: J, where: string) => {
        const dt = p?.datatype
        if (!PROP_DATATYPES.has(dt)) {
            error(where, `prop "${p?.name}" has unknown datatype "${dt}"`)
            return
        }
        if (!isObj(p) || !("defaultValue" in p)) {
            error(where, `prop "${p?.name}" has no defaultValue`)
            return
        }
        const dv = p.defaultValue
        if (dt === "variant") {
            const variants = p.variants
            if (!Array.isArray(variants) || variants.length === 0) error(where, `variant prop "${p.name}" has no variants`)
            else if (!variants.includes(dv)) error(where, `variant prop "${p.name}" defaultValue "${dv}" is not one of ${pyRepr(variants)}`)
        } else if (dt === "number" && typeof dv !== "number") {
            error(where, `number prop "${p.name}" has non-number defaultValue ${pyRepr(dv)}`)
        } else if (dt === "boolean" && typeof dv !== "boolean") {
            error(where, `boolean prop "${p.name}" has non-boolean defaultValue ${pyRepr(dv)}`)
        } else if (dt === "location" && dv && !locUids.has(dv)) {
            error(where, `location prop "${p.name}" defaults to missing location "${dv}"`)
        }
    }
    props.forEach((p) => checkProp(p, "props"))
    for (const r of roles) arr(r?.props).forEach((p) => checkProp(p, `role "${r?.name}"`))
    for (const c of chars) {
        for (const k of ["props", "overrideProps"]) arr(c?.[k]).forEach((p) => checkProp(p, `character "${c?.uid}" → ${k}`))
    }

    // ── Objectives ──
    for (const line of objectives) {
        const luid = line?.uid
        const lwhere = `questline "${luid}"`
        if (!IDENT.test(str(luid))) warn(lwhere, "questline uid is not a JS identifier — rt.objectives.<uid> will not work")
        for (const dup of dupes(arr(line?.quests).map((q) => q?.uid))) error(lwhere, `duplicate quest uid "${dup}"`)
        for (const q of arr(line?.quests)) {
            const quid = q?.uid
            const qwhere = `${lwhere} → quest "${quid}"`
            questIndex.add(key(luid, quid))
            if (!IDENT.test(str(quid))) warn(qwhere, "quest uid is not a JS identifier")
            if (JSON.stringify(q?.path) !== JSON.stringify([luid, quid])) {
                error(qwhere, `path ${pyRepr(q?.path)} must be ["${luid}", "${quid}"] — quest tracking keys off it`)
            }
            if (q?.ordered !== true) error(qwhere, "`ordered` must be true (the model allows no other value)")
            for (const dup of dupes(arr(q?.tasks).map((t) => t?.uid))) error(qwhere, `duplicate task uid "${dup}"`)
            if (arr(q?.tasks).length === 0) warn(qwhere, "quest has no tasks — it can never complete on its own")
            for (const t of arr(q?.tasks)) {
                const tuid = t?.uid
                const twhere = `${qwhere} → task "${tuid}"`
                taskIndex.add(key(luid, quid, tuid))
                if (!IDENT.test(str(tuid))) warn(twhere, "task uid is not a JS identifier")
                if (JSON.stringify(t?.path) !== JSON.stringify([luid, quid, tuid])) {
                    error(twhere, `path ${pyRepr(t?.path)} must be ["${luid}", "${quid}", "${tuid}"]`)
                }
                if (!t?.text) warn(twhere, "task has no text — nothing to show in the journal")
            }
        }
    }

    // ── Hooks ──
    const hookSpecs: [string, number, (p: string[]) => boolean, string][] = [
        ["FACTS::DISCOVERED::", 1, (p) => factUids.has(p[0]), "fact"],
        ["ITEMS::ACQUIRED::", 1, (p) => itemUids.has(p[0]), "item"],
        ["ITEMS::LOST::", 1, (p) => itemUids.has(p[0]), "item"],
        ["SITUATION::STARTED::", 1, (p) => situations.has(p[0]), "situation"],
        ["SITUATION::ENDED::", 1, (p) => situations.has(p[0]), "situation"],
        ["QUESTLINE::OPENED::", 1, (p) => lineIndex.has(p[0]), "questline"],
        ["QUESTLINE::CLOSED::", 1, (p) => lineIndex.has(p[0]), "questline"],
        ["QUEST::OPENED::", 2, (p) => questIndex.has(key(...p)), "quest"],
        ["QUEST::COMPLETED::", 2, (p) => questIndex.has(key(...p)), "quest"],
        ["QUEST::FAILED::", 2, (p) => questIndex.has(key(...p)), "quest"],
        ["TASK::OPENED::", 3, (p) => taskIndex.has(key(...p)), "task"],
        ["TASK::COMPLETED::", 3, (p) => taskIndex.has(key(...p)), "task"],
        ["TASK::FAILED::", 3, (p) => taskIndex.has(key(...p)), "task"],
    ]
    hookSpecs.sort((a, b) => b[0].length - a[0].length)
    for (const h of hooks) {
        const where = `hook "${h?.name || h?.hook}"`
        const hook = str(h?.hook)
        if (!hook) {
            error(where, "hook has no `hook` string — it can never fire")
            continue
        }
        if (!h?.body) warn(where, "hook has an empty body")
        const spec = hookSpecs.find(([prefix]) => hook.startsWith(prefix))
        if (!spec) {
            error(where, `unknown hook string "${hook}" — see the game_json skill references/scripting.md for the valid prefixes`)
            continue
        }
        const [prefix, arity, exists, label] = spec
        const parts = hook.slice(prefix.length).split("::")
        if (parts.length !== arity || !parts.every(Boolean)) {
            error(where, `hook string "${hook}" should end with ${arity} "::"-separated ${label} id(s)`)
        } else if (!exists(parts)) {
            error(where, `hook targets missing ${label} "${parts.join("::")}"`)
        }
    }

    // ── Functions & meters ──
    for (const f of functions) {
        if (!IDENT.test(str(f?.name))) error("functions", `function name "${f?.name}" is not a JS identifier — it is skipped silently at runtime`)
        if (!f?.body) warn(`function "${f?.name}"`, "function has an empty body")
    }
    for (const m of meters) {
        const where = `meter "${m?.uid}"`
        if (!isObj(m) || !("layout" in m)) error(where, "missing required field `layout` (use { \"opacity\": 1 })")
        if (!isObj(m) || !("progressBar" in m)) error(where, "missing required field `progressBar` (use null for a plain readout)")
        if (!m?.value) warn(where, "meter has no `value` script — it will show nothing")
        const pb = m?.progressBar
        if (isObj(pb) && pb.min !== undefined && pb.min !== null && pb.max !== undefined && pb.max !== null && pb.min >= pb.max) {
            error(where, `progressBar min (${pb.min}) must be below max (${pb.max})`)
        }
    }

    // ── Scripts: referenced state must be declared, and must compile ──
    for (const leaf of collectScriptLeaves(game)) {
        const where = leaf.path
        const src = leaf.source
        for (const m of src.matchAll(/\brt\.props\.([A-Za-z_$][\w$]*)/g)) {
            if (!propNames.has(m[1])) warn(where, `script uses rt.props.${m[1]}, which is not declared in \`props\` — writes to it are silently lost`)
        }
        for (const m of src.matchAll(/\brt\.facts\.([A-Za-z_$][\w$]*)/g)) {
            if (!factUids.has(m[1])) error(where, `script uses rt.facts.${m[1]}, which is not declared in \`facts\` — it will throw at runtime`)
        }
        for (const m of src.matchAll(/\brt\.items\.(?:add|remove|has|count)\(\s*['"]([^'"]+)['"]/g)) {
            if (!itemUids.has(m[1])) error(where, `script references missing item "${m[1]}"`)
        }
        for (const m of src.matchAll(/\brt\.ch\.([A-Za-z_$][\w$]*)/g)) {
            if (!charUids.has(m[1])) error(where, `script references missing character "${m[1]}" via rt.ch`)
        }
        for (const m of src.matchAll(/\brt\.objectives\.([A-Za-z_$][\w$.]*)/g)) {
            const parts = m[1].split(".").filter(Boolean)
            while (parts.length && OBJECTIVE_METHODS.has(parts[parts.length - 1])) parts.pop()
            if (!parts.length) continue
            if (!lineIndex.has(parts[0])) error(where, `script references missing questline "${parts[0]}"`)
            else if (parts.length >= 2 && !questIndex.has(key(parts[0], parts[1]))) error(where, `script references missing quest "${parts[0]}.${parts[1]}"`)
            else if (parts.length >= 3 && !taskIndex.has(key(parts[0], parts[1], parts[2]))) error(where, `script references missing task "${parts.slice(0, 3).join(".")}"`)
        }
        for (const m of src.matchAll(/\bstate\.situation\s*=\s*['"]([^'"]+)['"]/g)) {
            if (!situations.has(m[1])) warn(where, `script sets situation "${m[1]}", which is not declared in \`situations\``)
        }
        if (options.checkSyntax) {
            const problem = options.checkSyntax(leaf.params, src)
            if (problem) error(where, `syntax error: ${problem}`)
        }
    }

    // ── Unreachable windows ──
    for (const d of dialogs) {
        for (const w of arr(d?.windows)) {
            if (!inbound.has(key(d?.name, w?.uid))) {
                warn(`dialog "${d?.name}" → window "${w?.uid}"`, "nothing links to this window (no link, event, reaction or startupDialog targets it)")
            }
        }
    }

    return issues
}
