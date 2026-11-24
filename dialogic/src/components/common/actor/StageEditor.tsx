import React, { useMemo } from 'react';
import { Button, IconButton, SelectPicker } from 'rsuite';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { getChar, lookNames, resolveLookImage } from '../../../game/Character';
import { MAX_STAGE_PERSONS, StagePerson, createStagePerson } from '../../../game/Dialog';
import { GameDescription } from '../../../game/GameDescription';
import { StagePersonView } from '../../../exec/RenderView';
import StagePersonsView from '../../player/StagePersonsView';
import './stageeditor.css';

const CURRENT_CHAR = '@current';

interface StageEditorProps {
    game: GameDescription;
    value: StagePerson[] | undefined;
    onChange: (stage: StagePerson[] | undefined) => void;
    /** Whether a chooseStageScript overrides this static stage at runtime. */
    scripted?: boolean;
}

const slotLabel = (i: number, count: number) => {
    if (count === 1) return 'Center';
    if (i === 0) return 'Right';
    if (i === count - 1) return 'Left';
    return 'Middle';
};

/** Edits the static list of full-size persons (looks) shown on a dialog window. */
const StageEditor: React.FC<StageEditorProps> = ({ game, value, onChange, scripted }) => {
    const stage = value ?? [];

    const charData = useMemo(() => [
        { value: CURRENT_CHAR, label: '⟨current dialog character⟩' },
        ...game.chars.map(ch => ({ value: ch.uid, label: ch.looks?.main || ch.looks?.list.length ? ch.uid : `${ch.uid} (no looks)` })),
    ], [game.chars]);

    const allLookNames = useMemo(() => [...new Set(game.chars.flatMap(ch => lookNames(ch)))], [game.chars]);

    const update = (next: StagePerson[]) => onChange(next.length ? next : undefined);

    const setSlot = (i: number, slot: StagePerson) => update(stage.map((s, j) => (j === i ? slot : s)));

    const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= stage.length) return;
        const next = [...stage];
        [next[i], next[j]] = [next[j], next[i]];
        update(next);
    };

    // Static preview: "current dialog character" cannot be known in the editor.
    const preview: StagePersonView[] = stage.flatMap(slot => {
        const ch = slot.currentCharacter ? undefined : getChar(game, slot.character);
        const image = ch ? resolveLookImage(ch, slot.look) : undefined;
        return ch && image ? [{ char: ch.uid, name: ch.uid, look: slot.look, image, speaking: false }] : [];
    });

    return (
        <div className="stage-editor" data-testid="stage-editor">
            {scripted && <p className="stage-editor-note">chooseStage script is set: it overrides this list when it returns an array.</p>}
            {stage.map((slot, i) => {
                const ch = slot.currentCharacter ? undefined : getChar(game, slot.character);
                // The current dialog character is unknown here: offer every look name in the game.
                const names = slot.currentCharacter ? allLookNames : lookNames(ch);
                const looks = names.map(n => ({ value: n, label: n }));
                return (
                    <div className="stage-editor-row" key={i} data-testid={`stage-slot-${i}`}>
                        <span className="stage-editor-pos">{slotLabel(i, stage.length)}</span>
                        <SelectPicker
                            size="sm"
                            placeholder="character"
                            data={charData}
                            value={slot.currentCharacter ? CURRENT_CHAR : slot.character || null}
                            onChange={v => setSlot(i, v === CURRENT_CHAR
                                ? { character: '', currentCharacter: true, look: slot.look }
                                : { character: v ?? '', look: undefined })}
                            style={{ width: 170 }}
                            data-testid={`stage-slot-char-${i}`}
                        />
                        <SelectPicker
                            size="sm"
                            placeholder="default look"
                            data={looks}
                            value={slot.look ?? null}
                            onChange={v => setSlot(i, { ...slot, look: v ?? undefined })}
                            disabled={looks.length === 0}
                            style={{ width: 130 }}
                            data-testid={`stage-slot-look-${i}`}
                        />
                        <IconButton size="xs" icon={<ArrowRight size={14} />} title="Move right" disabled={i === 0} onClick={() => move(i, -1)} />
                        <IconButton size="xs" icon={<ArrowLeft size={14} />} title="Move left" disabled={i === stage.length - 1} onClick={() => move(i, 1)} />
                        <IconButton size="xs" icon={<Trash2 size={14} />} title="Remove" onClick={() => update(stage.filter((_, j) => j !== i))} />
                    </div>
                );
            })}
            <Button
                size="sm"
                startIcon={<Plus size={14} />}
                disabled={stage.length >= MAX_STAGE_PERSONS}
                onClick={() => update([...stage, createStagePerson()])}
                data-testid="stage-add-person"
            >
                Add person ({stage.length}/{MAX_STAGE_PERSONS})
            </Button>
            {preview.length > 0 && (
                <div className="stage-editor-preview">
                    <StagePersonsView persons={preview} alignment="full" />
                </div>
            )}
        </div>
    );
};

export default StageEditor;
