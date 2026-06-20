import { DialogLink, DialogLinkDirection, LinkType } from "./Dialog";
import { GameDescription } from "./GameDescription";

/**
 * In-game sanity check.
 *
 * Walks the whole GameDescription looking for "dangling pointers" — links and
 * references that point at something that no longer exists:
 *  - dialog/location/character links whose target window, location or character
 *    is missing,
 *  - the startup dialog, actors, situations, point-and-click widgets and event
 *    links that reference a missing object,
 *  - image file references (server-stored filenames) that are not present on
 *    the server.
 *
 * The check is pure: it takes the game model plus the list of image filenames
 * known to the server and returns a flat list of issues. The UI owns fetching
 * the file list and rendering the result.
 */

export type SanityIssueCategory = "link" | "reference" | "file";
export type SanitySeverity = "error" | "warning";

export interface SanityIssue {
    category: SanityIssueCategory;
    severity: SanitySeverity;
    /** What is wrong, human-readable. */
    message: string;
    /** Where in the game model the problem lives, human-readable. */
    location: string;
    /** The dangling pointer value itself, when there is one. */
    target?: string;
    /** Dialog name, when the issue lives inside a dialog (lets the UI link to it). */
    dialogName?: string;
}

export interface SanityCheckStats {
    dialogs: number;
    windows: number;
    links: number;
    locations: number;
    characters: number;
    imageRefs: number;
}

export interface SanityCheckResult {
    issues: SanityIssue[];
    /** False when the server image list was unavailable and file checks were skipped. */
    checkedFiles: boolean;
    stats: SanityCheckStats;
}

/**
 * Mirrors `isServerImage` in components/common/ImagePicker without importing
 * from the components layer (game/ must not depend on components/). A value is
 * a server-stored image when it is a bare filename rather than a bundled asset,
 * an absolute path or an external URL.
 */
function isServerImage(v: string): boolean {
    return !v.startsWith("game_assets/") && !v.startsWith("/") && !v.startsWith("http");
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|tiff?|avif)$/i;

/** A string leaf that is exactly a server image filename (not prose or a script). */
function looksLikeServerImage(s: string): boolean {
    if (s.length === 0 || s.includes("\n") || s.includes("://")) return false;
    return IMAGE_EXT.test(s.trim()) && isServerImage(s);
}

export function runSanityCheck(
    game: GameDescription,
    imageFiles: string[] | null,
): SanityCheckResult {
    const issues: SanityIssue[] = [];
    const stats: SanityCheckStats = {
        dialogs: game.dialogs.length,
        windows: 0,
        links: 0,
        locations: game.locs.length,
        characters: game.chars.length,
        imageRefs: 0,
    };

    // ── Lookup tables ──
    const dialogNames = new Set(game.dialogs.map(d => d.name));
    const windowsByDialog = new Map<string, Set<string>>(
        game.dialogs.map(d => [d.name, new Set(d.windows.map(w => w.uid))]),
    );
    const locUids = new Set(game.locs.map(l => l.uid));
    const charUids = new Set(game.chars.map(c => c.uid));
    const situations = new Set(game.situations ?? []);
    const pacIds = new Set((game.pacWidgets ?? []).map(p => p.id));

    const add = (issue: SanityIssue) => issues.push(issue);

    /** Validate a qualified dialog-window target (used by push/jump/event/reaction). */
    const checkWindowTarget = (
        dialog: string | undefined,
        window: string | undefined,
        location: string,
        what: string,
        dialogName?: string,
    ) => {
        if (!dialog || !window) {
            add({ category: "link", severity: "warning", message: `${what} has no target set`, location, dialogName });
            return;
        }
        if (!dialogNames.has(dialog)) {
            add({ category: "link", severity: "error", message: `${what} points to missing dialog "${dialog}"`, location, target: `${dialog} / ${window}`, dialogName });
            return;
        }
        if (!windowsByDialog.get(dialog)?.has(window)) {
            add({ category: "link", severity: "error", message: `${what} points to missing window "${window}" in dialog "${dialog}"`, location, target: `${dialog} / ${window}`, dialogName });
        }
    };

    /**
     * Validate a single link direction. `dialogName` is the dialog this link
     * belongs to (so `local` targets can be resolved); pass undefined for links
     * that live on locations or character dialogs, where `local` is meaningless.
     */
    const checkDirection = (dir: DialogLinkDirection, location: string, dialogName?: string) => {
        switch (dir.type) {
            case LinkType.Local: {
                const target = dir.direction;
                if (dialogName === undefined) {
                    if (target) {
                        add({ category: "link", severity: "warning", message: `Local link "${target}" is used outside a dialog and will not navigate anywhere`, location, target, dialogName });
                    }
                    return;
                }
                if (!target) {
                    add({ category: "link", severity: "warning", message: "Local link has no target window", location, dialogName });
                    return;
                }
                if (!windowsByDialog.get(dialogName)?.has(target)) {
                    add({ category: "link", severity: "error", message: `Local link points to missing window "${target}" in dialog "${dialogName}"`, location, target, dialogName });
                }
                return;
            }
            case LinkType.Push:
            case LinkType.Jump:
            case LinkType.ResetJump: {
                const qd = dir.qualifiedDirection;
                checkWindowTarget(qd?.dialog, qd?.window, location, `${dir.type} link`, dialogName);
                return;
            }
            case LinkType.NavigateToLocation: {
                const target = dir.direction;
                if (!target) {
                    add({ category: "link", severity: "warning", message: "Location link has no target", location, dialogName });
                } else if (!locUids.has(target)) {
                    add({ category: "link", severity: "error", message: `Location link points to missing location "${target}"`, location, target, dialogName });
                }
                return;
            }
            case LinkType.TalkToPerson: {
                const target = dir.direction;
                if (!target) {
                    add({ category: "link", severity: "warning", message: "Talk-to-person link has no target", location, dialogName });
                } else if (!charUids.has(target)) {
                    add({ category: "link", severity: "error", message: `Talk-to-person link points to missing character "${target}"`, location, target, dialogName });
                }
                return;
            }
            // Pop / Return / QuickReply have no target to validate.
            default:
                return;
        }
    };

    const checkLink = (link: DialogLink, location: string, dialogName?: string) => {
        stats.links += 1;
        checkDirection(link.mainDirection, location, dialogName);
        link.alternativeDirections?.forEach((dir, i) =>
            checkDirection(dir, `${location} / alternative ${i + 1}`, dialogName),
        );
        if (link.changeLocationInBg && !locUids.has(link.changeLocationInBg)) {
            add({ category: "reference", severity: "error", message: `Link background change points to missing location "${link.changeLocationInBg}"`, location, target: link.changeLocationInBg, dialogName });
        }
    };

    // ── Dialogs / windows ──
    for (const dialog of game.dialogs) {
        for (const window of dialog.windows) {
            stats.windows += 1;
            const where = `Dialog "${dialog.name}" → window "${window.uid}"`;
            window.links.forEach((link, i) =>
                checkLink(link, `${where} → link ${i + 1}`, dialog.name),
            );

            if (window.actor && window.actor.character && !window.actor.currentCharacter
                && !charUids.has(window.actor.character)) {
                add({ category: "reference", severity: "error", message: `Actor references missing character "${window.actor.character}"`, location: where, target: window.actor.character, dialogName: dialog.name });
            }
            if (window.changeLocationInBg && !locUids.has(window.changeLocationInBg)) {
                add({ category: "reference", severity: "error", message: `Background location change points to missing location "${window.changeLocationInBg}"`, location: where, target: window.changeLocationInBg, dialogName: dialog.name });
            }
            if (window.changeSituation && !situations.has(window.changeSituation)) {
                add({ category: "reference", severity: "warning", message: `Window sets unknown situation "${window.changeSituation}"`, location: where, target: window.changeSituation, dialogName: dialog.name });
            }
            if (window.specialWidget) {
                const [kind, id] = window.specialWidget.split("::");
                if (kind === "pac" && !pacIds.has(id)) {
                    add({ category: "reference", severity: "error", message: `Window uses missing point-and-click widget "${id}"`, location: where, target: window.specialWidget, dialogName: dialog.name });
                }
            }
        }
    }

    // ── Locations ──
    for (const loc of game.locs) {
        const where = `Location "${loc.uid}"`;
        loc.links?.forEach((link, i) => checkLink(link, `${where} → link ${i + 1}`));
        loc.routes?.forEach((r) => {
            if (!locUids.has(r)) {
                add({ category: "link", severity: "error", message: `Route points to missing location "${r}"`, location: `${where} → routes`, target: r });
            }
        });
        loc.goto?.forEach((g) => {
            if (!locUids.has(g)) {
                add({ category: "link", severity: "error", message: `Goto points to missing location "${g}"`, location: `${where} → goto`, target: g });
            }
        });
    }

    // ── Characters / discussion dialogs ──
    for (const char of game.chars) {
        if (!char.dialog) continue;
        const where = `Character "${char.uid}" → discussion`;
        char.dialog.links?.forEach((link, i) => checkLink(link, `${where} → link ${i + 1}`));
        char.dialog.behavior?.reactions?.forEach((reaction, i) => {
            const dw = reaction.dialogWindow;
            if (dw) {
                checkWindowTarget(dw.dialog, dw.window, `${where} → reaction ${i + 1}`, "Reaction window");
            }
        });
    }

    // ── Startup dialog ──
    if (game.startupDialog) {
        checkWindowTarget(game.startupDialog.dialog, game.startupDialog.window, "Startup dialog", "Startup dialog");
    }

    // ── Events ──
    (game.events ?? []).forEach((event) => {
        if (event.link) {
            checkWindowTarget(event.link.dialog, event.link.window, `Event "${event.name}"`, "Event link");
        }
    });

    // ── Point-and-click zone navigation ──
    // A PAC widget is not bound to a single dialog, so `local` (and `pop`)
    // resolve against whatever dialog hosts the scene at runtime and cannot be
    // validated here — every other direction has an absolute target we check.
    (game.pacWidgets ?? []).forEach((pac) => {
        pac.zones.forEach((zone) => {
            const where = `Point-and-click "${pac.id}" → zone "${zone.name || zone.id}"`;
            const checkZoneDir = (dir: DialogLinkDirection, location: string) => {
                if (dir.type === LinkType.Local) return;
                checkDirection(dir, location);
            };
            if (zone.mainDirection) {
                checkZoneDir(zone.mainDirection, `${where} → click`);
            }
            zone.alternativeDirections?.forEach((dir, i) =>
                checkZoneDir(dir, `${where} → alternative ${i + 1}`),
            );
        });
    });

    // ── File references (server images) ──
    if (imageFiles === null) {
        return { issues, checkedFiles: false, stats };
    }
    const imageSet = new Set(imageFiles);
    const missingFiles = new Map<string, string>(); // filename → first location
    const seenAt = (path: string, value: string) => {
        stats.imageRefs += 1;
        if (!imageSet.has(value) && !missingFiles.has(value)) {
            missingFiles.set(value, path);
        }
    };
    walkImageRefs(game, seenAt);
    for (const [filename, location] of missingFiles) {
        add({ category: "file", severity: "error", message: `Image file "${filename}" is referenced but missing on the server`, location, target: filename });
    }

    return { issues, checkedFiles: true, stats };
}

/** Deep-walk the game, reporting every string leaf that is a server image reference, with a readable path. */
function walkImageRefs(value: unknown, visit: (path: string, value: string) => void, path = ""): void {
    if (typeof value === "string") {
        if (looksLikeServerImage(value)) visit(path || "(root)", value);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, i) => walkImageRefs(item, visit, `${path}[${i}]`));
        return;
    }
    if (value && typeof value === "object") {
        for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
            walkImageRefs(v, visit, path ? `${path}.${key}` : key);
        }
    }
}
