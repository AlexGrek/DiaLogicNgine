import lodash from 'lodash';
import { GameDescription } from './GameDescription';

/**
 * Image reference scanning for the Resources image manager.
 *
 * Server-uploaded / generated images are referenced throughout the game model
 * as plain filename strings (e.g. a character avatar, a location background, a
 * dialog window background, the start-menu background, …). Rather than knowing
 * every field that can hold an image, we deep-walk the whole GameDescription
 * and treat any string leaf whose value is exactly an image filename as a
 * reference. Exact whole-string equality is intentional: it counts genuine
 * image fields while never matching a filename that merely appears as a
 * substring of a script or prose text.
 */

/** Walk every string leaf in an arbitrary value, invoking `visit` for each. */
function forEachStringLeaf(value: unknown, visit: (s: string) => void): void {
    if (typeof value === 'string') {
        visit(value);
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) forEachStringLeaf(item, visit);
        return;
    }
    if (value && typeof value === 'object') {
        for (const v of Object.values(value as Record<string, unknown>)) {
            forEachStringLeaf(v, visit);
        }
    }
}

/**
 * Count, for each of `filenames`, how many times it is referenced as a string
 * leaf in `game`. Returns a record keyed by filename.
 */
export function countImageReferences(
    game: GameDescription,
    filenames: string[],
): Record<string, number> {
    const wanted = new Set(filenames);
    const counts: Record<string, number> = {};
    for (const f of filenames) counts[f] = 0;
    forEachStringLeaf(game, (s) => {
        if (wanted.has(s)) counts[s] += 1;
    });
    return counts;
}

/** Recursively replace any string leaf contained in `targets` with `''`. */
function stripLeaves(value: unknown, targets: Set<string>): unknown {
    if (typeof value === 'string') {
        return targets.has(value) ? '' : value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => stripLeaves(item, targets));
    }
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        for (const key of Object.keys(obj)) {
            obj[key] = stripLeaves(obj[key], targets);
        }
        return obj;
    }
    return value;
}

/**
 * Return a deep clone of `game` with every reference to any of `filenames`
 * removed (replaced with an empty string), so deleting images keeps the game
 * model consistent instead of leaving dangling references.
 */
export function removeImageReferences(
    game: GameDescription,
    filenames: string[],
): GameDescription {
    if (filenames.length === 0) return game;
    const clone = lodash.cloneDeep(game);
    return stripLeaves(clone, new Set(filenames)) as GameDescription;
}
