import React, { useState } from 'react';
import { InputPicker, SelectPicker } from 'rsuite';
import { GameDescription } from '../../game/GameDescription';
import {
    makeFactDiscoveredHook,
    makeItemAcquiredHook,
    makeItemLostHook,
    makeQuestCompletedHook,
    makeQuestFailedHook,
    makeQuestLineClosedHook,
    makeQuestLineOpenedHook,
    makeQuestOpenedHook,
    makeSituationEndedHook,
    makeSituationStartedHook,
    makeTaskCompletedHook,
    makeTaskFailedHook,
    makeTaskOpenedHook,
} from '../../game/HookScript';
// Reuse the same visual language as SmartCodeGenerators
import './code_editor/SmartCodeGenerators.css';

type PickerKind = 'fact' | 'item' | 'situation' | 'quest';

interface SmartHookPickerProps {
    game: GameDescription;
    onSelect: (hookString: string) => void;
    onAddSituation?: (name: string) => void;
}

// ── Facts ────────────────────────────────────────────────────────────────────
const FactHookPanel: React.FC<SmartHookPickerProps> = ({ game, onSelect }) => {
    const [uid, setUid] = useState<string | null>(null);

    if (game.facts.length === 0)
        return <p className='smart-gen-hint'>No facts defined yet.</p>;

    const data = game.facts.map(f => ({ label: f.short || f.uid, value: f.uid }));
    const hook = uid ? makeFactDiscoveredHook(uid) : null;

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <SelectPicker size='sm' placeholder='Fact' data={data} value={uid} onChange={setUid} style={{ width: 220 }} />
            </div>
            {hook && <code className='smart-gen-path'>{hook}</code>}
            <div className='smart-gen-actions'>
                <span className='smart-gen-group-label'>When</span>
                <button className='smart-gen-action-btn' disabled={!uid}
                    onClick={() => uid && onSelect(makeFactDiscoveredHook(uid))}>
                    Discovered
                </button>
            </div>
        </div>
    );
};

// ── Items ────────────────────────────────────────────────────────────────────
const ItemHookPanel: React.FC<SmartHookPickerProps> = ({ game, onSelect }) => {
    const [uid, setUid] = useState<string | null>(null);

    if (game.items.length === 0)
        return <p className='smart-gen-hint'>No items defined yet.</p>;

    const data = game.items.map(i => ({ label: i.name || i.uid, value: i.uid }));
    const acquiredHook = uid ? makeItemAcquiredHook(uid) : null;

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <SelectPicker size='sm' placeholder='Item' data={data} value={uid} onChange={setUid} style={{ width: 220 }} />
            </div>
            {uid && <code className='smart-gen-path'>{acquiredHook}</code>}
            <div className='smart-gen-actions'>
                <span className='smart-gen-group-label'>When</span>
                <button className='smart-gen-action-btn' disabled={!uid}
                    onClick={() => uid && onSelect(makeItemAcquiredHook(uid))}>
                    Acquired
                </button>
                <button className='smart-gen-action-btn' disabled={!uid}
                    onClick={() => uid && onSelect(makeItemLostHook(uid))}>
                    Lost
                </button>
            </div>
        </div>
    );
};

// ── Situations ───────────────────────────────────────────────────────────────
const SituationHookPanel: React.FC<SmartHookPickerProps> = ({ game, onSelect, onAddSituation }) => {
    const [name, setName] = useState<string | null>(null);

    const data = game.situations.map(s => ({ label: s, value: s }));
    const startedHook = name ? makeSituationStartedHook(name) : null;

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <InputPicker
                    size='sm'
                    placeholder='Situation'
                    data={data}
                    value={name}
                    onChange={setName}
                    creatable={!!onAddSituation}
                    onCreate={(value) => onAddSituation?.(value)}
                    style={{ width: 220 }}
                />
            </div>
            {name && <code className='smart-gen-path'>{startedHook}</code>}
            <div className='smart-gen-actions'>
                <span className='smart-gen-group-label'>When</span>
                <button className='smart-gen-action-btn' disabled={!name}
                    onClick={() => name && onSelect(makeSituationStartedHook(name))}>
                    Started
                </button>
                <button className='smart-gen-action-btn' disabled={!name}
                    onClick={() => name && onSelect(makeSituationEndedHook(name))}>
                    Ended
                </button>
            </div>
        </div>
    );
};

// ── Quest / Task / Questline ─────────────────────────────────────────────────
const QuestHookPanel: React.FC<SmartHookPickerProps> = ({ game, onSelect }) => {
    const [lineUid, setLineUid] = useState<string | null>(null);
    const [questUid, setQuestUid] = useState<string | null>(null);
    const [taskUid, setTaskUid] = useState<string | null>(null);

    const line = game.objectives.find(o => o.uid === lineUid) ?? null;
    const quest = line?.quests.find(q => q.uid === questUid) ?? null;
    const task = quest?.tasks.find(t => t.uid === taskUid) ?? null;

    const lineData = game.objectives.map(o => ({ label: o.name || o.uid, value: o.uid }));
    const questData = (line?.quests ?? []).map(q => ({ label: q.name || q.uid, value: q.uid }));
    const taskData = (quest?.tasks ?? []).map(t => ({ label: t.text || t.uid, value: t.uid }));

    const onLine = (v: string | null) => { setLineUid(v); setQuestUid(null); setTaskUid(null); };
    const onQuest = (v: string | null) => { setQuestUid(v); setTaskUid(null); };

    // preview: deepest selected level
    const previewHook = task
        ? makeTaskOpenedHook(task.path)
        : quest
            ? makeQuestOpenedHook(quest.path)
            : line
                ? makeQuestLineOpenedHook(line.uid)
                : null;

    if (game.objectives.length === 0)
        return <p className='smart-gen-hint'>No quest lines defined yet.</p>;

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <SelectPicker size='sm' cleanable={false} placeholder='Quest line' data={lineData} value={lineUid} onChange={onLine} style={{ width: 150 }} />
                <SelectPicker size='sm' placeholder='Quest (optional)' data={questData} value={questUid} onChange={onQuest} disabled={!line} style={{ width: 150 }} />
                <SelectPicker size='sm' placeholder='Task (optional)' data={taskData} value={taskUid} onChange={setTaskUid} disabled={!quest} style={{ width: 160 }} />
            </div>

            {previewHook && <code className='smart-gen-path'>{previewHook}</code>}

            {/* Questline actions */}
            {line && !quest && (
                <div className='smart-gen-actions'>
                    <span className='smart-gen-group-label'>Questline</span>
                    <button className='smart-gen-action-btn' onClick={() => onSelect(makeQuestLineOpenedHook(line.uid))}>Opened</button>
                    <button className='smart-gen-action-btn' onClick={() => onSelect(makeQuestLineClosedHook(line.uid))}>Closed</button>
                </div>
            )}

            {/* Quest actions */}
            {quest && !task && (
                <div className='smart-gen-actions'>
                    <span className='smart-gen-group-label'>Quest</span>
                    <button className='smart-gen-action-btn' onClick={() => onSelect(makeQuestOpenedHook(quest.path))}>Opened</button>
                    <button className='smart-gen-action-btn' onClick={() => onSelect(makeQuestCompletedHook(quest.path))}>Completed</button>
                    <button className='smart-gen-action-btn' onClick={() => onSelect(makeQuestFailedHook(quest.path))}>Failed</button>
                </div>
            )}

            {/* Task actions */}
            {task && (
                <div className='smart-gen-actions'>
                    <span className='smart-gen-group-label'>Task</span>
                    <button className='smart-gen-action-btn' onClick={() => onSelect(makeTaskOpenedHook(task.path))}>Opened</button>
                    <button className='smart-gen-action-btn' onClick={() => onSelect(makeTaskCompletedHook(task.path))}>Completed</button>
                    <button className='smart-gen-action-btn' onClick={() => onSelect(makeTaskFailedHook(task.path))}>Failed</button>
                </div>
            )}

            {!line && <p className='smart-gen-hint'>Pick a quest line to see lifecycle events.</p>}
        </div>
    );
};

// ── Container ────────────────────────────────────────────────────────────────
const SmartHookPicker: React.FC<SmartHookPickerProps> = ({ game, onSelect, onAddSituation }) => {
    const [active, setActive] = useState<PickerKind | null>(null);

    const toggle = (k: PickerKind) => setActive(prev => (prev === k ? null : k));

    return (
        <div className='smart-gen' data-testid='smart-hook-picker'>
            <div className='smart-gen-toolbar'>
                <span className='smart-gen-title'>Pick hook</span>
                <button className={`smart-gen-tab${active === 'fact' ? ' active' : ''}`} onClick={() => toggle('fact')}>Facts</button>
                <button className={`smart-gen-tab${active === 'item' ? ' active' : ''}`} onClick={() => toggle('item')}>Items</button>
                <button className={`smart-gen-tab${active === 'situation' ? ' active' : ''}`} onClick={() => toggle('situation')}>Situations</button>
                <button className={`smart-gen-tab${active === 'quest' ? ' active' : ''}`} onClick={() => toggle('quest')}>Quest lifecycle</button>
            </div>
            {active === 'fact'      && <FactHookPanel      game={game} onSelect={onSelect} />}
            {active === 'item'      && <ItemHookPanel      game={game} onSelect={onSelect} />}
            {active === 'situation' && <SituationHookPanel game={game} onSelect={onSelect} onAddSituation={onAddSituation} />}
            {active === 'quest'     && <QuestHookPanel     game={game} onSelect={onSelect} />}
        </div>
    );
};

export default SmartHookPicker;
