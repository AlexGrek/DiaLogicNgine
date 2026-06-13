import { GameDescription } from '../../game/GameDescription';
import { QuestPath, TaskPath } from '../../game/Objectives';

export interface Option {
    label: string;
    value: string;
}

/** Display name for a character, falling back to its uid. */
export function charLabel(game: GameDescription, uid: string): string {
    const ch = game.chars.find(c => c.uid === uid);
    return ch?.displayName?.main ? `${ch.displayName.main} (${uid})` : uid;
}

/** Display name for a location, falling back to its uid. */
export function locLabel(game: GameDescription, uid: string): string {
    const loc = game.locs.find(l => l.uid === uid);
    return loc?.displayName ? `${loc.displayName} (${uid})` : uid;
}

export function charOptions(game: GameDescription): Option[] {
    return game.chars.map(c => ({ label: charLabel(game, c.uid), value: c.uid }));
}

export function locOptions(game: GameDescription): Option[] {
    return game.locs.map(l => ({ label: locLabel(game, l.uid), value: l.uid }));
}

export function factOptions(game: GameDescription): Option[] {
    return game.facts.map(f => ({ label: f.short ? `${f.short} (${f.uid})` : f.uid, value: f.uid }));
}

export function itemOptions(game: GameDescription): Option[] {
    return game.items.map(i => ({ label: i.name ? `${i.name} (${i.uid})` : i.uid, value: i.uid }));
}

export function eventOptions(game: GameDescription): Option[] {
    return game.events.map(e => ({ label: e.name, value: e.name }));
}

export function situationOptions(game: GameDescription): Option[] {
    return game.situations.map(s => ({ label: s, value: s }));
}

export function dialogOptions(game: GameDescription): Option[] {
    return game.dialogs.map(d => ({ label: d.name, value: d.name }));
}

export function windowOptions(game: GameDescription, dialog: string): Option[] {
    const d = game.dialogs.find(d => d.name === dialog);
    if (!d) return [];
    return d.windows.map(w => ({ label: w.uid, value: w.uid }));
}

export function questLineOptions(game: GameDescription): Option[] {
    return game.objectives.map(o => ({ label: o.name ? `${o.name} (${o.uid})` : o.uid, value: o.uid }));
}

// --- Quest / Task path helpers --------------------------------------------
// TagPicker works with string values, so paths are encoded as joined strings.

const SEP = '::';

export function encodePath(path: string[]): string {
    return path.join(SEP);
}

export function decodeQuestPath(value: string): QuestPath {
    const parts = value.split(SEP);
    return [parts[0], parts[1]] as QuestPath;
}

export function decodeTaskPath(value: string): TaskPath {
    const parts = value.split(SEP);
    return [parts[0], parts[1], parts[2]] as TaskPath;
}

export function questOptions(game: GameDescription): Option[] {
    const result: Option[] = [];
    for (const line of game.objectives) {
        for (const quest of line.quests) {
            result.push({
                label: `${line.name || line.uid} / ${quest.name || quest.uid}`,
                value: encodePath([line.uid, quest.uid]),
            });
        }
    }
    return result;
}

export function taskOptions(game: GameDescription): Option[] {
    const result: Option[] = [];
    for (const line of game.objectives) {
        for (const quest of line.quests) {
            for (const task of quest.tasks) {
                result.push({
                    label: `${line.name || line.uid} / ${quest.name || quest.uid} / ${task.text || task.uid}`,
                    value: encodePath([line.uid, quest.uid, task.uid]),
                });
            }
        }
    }
    return result;
}
