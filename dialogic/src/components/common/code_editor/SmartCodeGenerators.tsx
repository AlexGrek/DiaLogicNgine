import React, { useState } from 'react';
import { Button, ButtonGroup, InputNumber, SelectPicker } from 'rsuite';
import { GameDescription } from '../../../game/GameDescription';
import ItemsPicker from '../../menuitems/items/ItemsPicker';
import './SmartCodeGenerators.css';

interface SmartCodeGeneratorsProps {
    game: GameDescription;
    onInsert: (snippet: string) => void;
}

type GeneratorKind = 'quest' | 'fact' | 'item' | 'situation';

const IDENT = /^[A-Za-z_$][\w$]*$/;
// Build a safe member accessor: dot notation when the key is a valid identifier,
// bracket notation (quoted) otherwise.
const access = (base: string, key: string) => IDENT.test(key) ? `${base}.${key}` : `${base}[${JSON.stringify(key)}]`;
const guard = (expr: string) => `if (${expr}) {\n    \n}`;

// ----------------------------------------------------------------------------
// Quest lifecycle builder
// ----------------------------------------------------------------------------
const QuestCodeBuilder: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert }) => {
    const [lineUid, setLineUid] = useState<string | null>(null);
    const [questUid, setQuestUid] = useState<string | null>(null);
    const [taskUid, setTaskUid] = useState<string | null>(null);

    const line = game.objectives.find(o => o.uid === lineUid) ?? null;
    const quest = line?.quests.find(q => q.uid === questUid) ?? null;
    const task = quest?.tasks.find(t => t.uid === taskUid) ?? null;

    const lineData = game.objectives.map(o => ({ label: o.name || o.uid, value: o.uid }));
    const questData = (line?.quests ?? []).map(q => ({ label: q.name || q.uid, value: q.uid }));
    const taskData = (quest?.tasks ?? []).map(t => ({ label: t.text || t.uid, value: t.uid }));

    const level: 'task' | 'quest' | 'line' | null = task ? 'task' : quest ? 'quest' : line ? 'line' : null;

    let path = '';
    if (line) path = access('objectives', line.uid);
    if (line && quest) path = access(path, quest.uid);
    if (line && quest && task) path = access(path, task.uid);

    const statementActions: [string, string][] =
        level === 'line' ? [['Open', 'open'], ['Close', 'close']]
            : (level === 'quest' || level === 'task') ? [['Open', 'open'], ['Complete', 'complete'], ['Fail', 'fail']]
                : [];

    const conditionActions: [string, string][] =
        level === 'task' ? [['If open', `${path}.isOpen`], ['If completed', `${path}.isCompleted`], ['If failed', `${path}.isFailed`]]
            : (level === 'quest' || level === 'line') ? [['If open', `${path}.status === 'open'`], ['If completed', `${path}.status === 'completed'`], ['If failed', `${path}.status === 'failed'`]]
                : [];

    const onLine = (v: string | null) => { setLineUid(v); setQuestUid(null); setTaskUid(null); };
    const onQuest = (v: string | null) => { setQuestUid(v); setTaskUid(null); };

    if (game.objectives.length === 0) {
        return <p className='smart-gen-hint'>No quest lines defined yet. Create some in the Facts &amp; Objectives section.</p>;
    }

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <SelectPicker size='sm' cleanable={false} placeholder='Quest line' data={lineData} value={lineUid} onChange={onLine} style={{ width: 150 }} />
                <SelectPicker size='sm' placeholder='Quest (optional)' data={questData} value={questUid} onChange={onQuest} disabled={!line} style={{ width: 150 }} />
                <SelectPicker size='sm' placeholder='Sub-quest (optional)' data={taskData} value={taskUid} onChange={setTaskUid} disabled={!quest} style={{ width: 160 }} />
            </div>

            {level && (
                <>
                    <code className='smart-gen-path'>{path}</code>
                    <div className='smart-gen-actions'>
                        <span className='smart-gen-group-label'>Set status</span>
                        {statementActions.map(([label, action]) => (
                            <button key={action} className='smart-gen-action-btn' onClick={() => onInsert(`${path}.${action}()`)}>{label}</button>
                        ))}
                    </div>
                    <div className='smart-gen-actions'>
                        <span className='smart-gen-group-label'>Check status</span>
                        {conditionActions.map(([label, expr]) => (
                            <button key={label} className='smart-gen-action-btn' onClick={() => onInsert(guard(expr))}>{label}</button>
                        ))}
                    </div>
                </>
            )}
            {!level && <p className='smart-gen-hint'>Pick a quest line to generate lifecycle code.</p>}
        </div>
    );
};

// ----------------------------------------------------------------------------
// Facts lifecycle builder
// ----------------------------------------------------------------------------
const FactCodeBuilder: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert }) => {
    const [factUid, setFactUid] = useState<string | null>(null);

    if (game.facts.length === 0) {
        return <p className='smart-gen-hint'>No facts defined yet. Create some in the Facts &amp; Objectives section.</p>;
    }

    const factData = game.facts.map(f => ({ label: f.short || f.uid, value: f.uid }));
    const base = factUid ? access('facts', factUid) : '';

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <SelectPicker size='sm' placeholder='Fact' data={factData} value={factUid} onChange={setFactUid} style={{ width: 220 }} />
            </div>
            {factUid && (
                <>
                    <code className='smart-gen-path'>{base}</code>
                    <div className='smart-gen-actions'>
                        <span className='smart-gen-group-label'>Set</span>
                        <button className='smart-gen-action-btn' onClick={() => onInsert(`${base}.know()`)}>Make known</button>
                    </div>
                    <div className='smart-gen-actions'>
                        <span className='smart-gen-group-label'>Check</span>
                        <button className='smart-gen-action-btn' onClick={() => onInsert(guard(`${base}.known`))}>If known</button>
                        <button className='smart-gen-action-btn' onClick={() => onInsert(guard(`!${base}.known`))}>If not known</button>
                    </div>
                </>
            )}
            {!factUid && <p className='smart-gen-hint'>Pick a fact to generate code.</p>}
        </div>
    );
};

// ----------------------------------------------------------------------------
// Inventory (add / remove items) builder
// ----------------------------------------------------------------------------
const ItemCodeBuilder: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert }) => {
    const [itemUid, setItemUid] = useState<string | null>(null);
    const [op, setOp] = useState<'add' | 'remove'>('add');
    const [qty, setQty] = useState<number>(1);

    if (game.items.length === 0) {
        return <p className='smart-gen-hint'>No items defined yet. Create some in the Items section.</p>;
    }

    const count = Math.max(1, Math.floor(qty || 1));
    const itemArg = itemUid ? JSON.stringify(itemUid) : "''";
    const mutation = count > 1 ? `items.${op}(${itemArg}, ${count})` : `items.${op}(${itemArg})`;

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <ItemsPicker game={game} placeholder='Item' value={itemUid ?? undefined} onPickUID={setItemUid} />
                <ButtonGroup size='sm'>
                    <Button appearance={op === 'add' ? 'primary' : 'default'} onClick={() => setOp('add')}>Add</Button>
                    <Button appearance={op === 'remove' ? 'primary' : 'default'} onClick={() => setOp('remove')}>Remove</Button>
                </ButtonGroup>
                <InputNumber size='sm' min={1} value={qty} onChange={v => setQty(Number(v) || 1)} style={{ width: 90 }} />
            </div>

            <code className='smart-gen-path'>{mutation}</code>
            <div className='smart-gen-actions'>
                <span className='smart-gen-group-label'>Insert</span>
                <button className='smart-gen-action-btn' disabled={!itemUid} onClick={() => onInsert(mutation)}>
                    {op === 'add' ? `Add ${count > 1 ? count + '×' : ''}item` : `Remove ${count > 1 ? count + '×' : ''}item`}
                </button>
            </div>
            <div className='smart-gen-actions'>
                <span className='smart-gen-group-label'>Check inventory</span>
                <button className='smart-gen-action-btn' disabled={!itemUid} onClick={() => onInsert(guard(`items.has(${itemArg})`))}>If has item</button>
                <button className='smart-gen-action-btn' disabled={!itemUid} onClick={() => onInsert(guard(`items.count(${itemArg}) >= ${count}`))}>If count ≥ {count}</button>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------------
// Situation lifecycle builder
// ----------------------------------------------------------------------------
const SituationCodeBuilder: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert }) => {
    const [sitName, setSitName] = useState<string | null>(null);

    if (game.situations.length === 0) {
        return <p className='smart-gen-hint'>No situations defined yet. Add them in the game configuration.</p>;
    }

    const sitData = game.situations.map(s => ({ label: s, value: s }));

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <SelectPicker size='sm' placeholder='Situation' data={sitData} value={sitName} onChange={setSitName} style={{ width: 200 }} />
            </div>

            {sitName && <code className='smart-gen-path'>situation === {JSON.stringify(sitName)}</code>}

            <div className='smart-gen-actions'>
                <span className='smart-gen-group-label'>Check</span>
                <button className='smart-gen-action-btn' disabled={!sitName}
                    onClick={() => onInsert(guard(`situation === ${JSON.stringify(sitName)}`))}>
                    If active
                </button>
                <button className='smart-gen-action-btn' disabled={!sitName}
                    onClick={() => onInsert(guard(`situation !== ${JSON.stringify(sitName)}`))}>
                    If not active
                </button>
                <button className='smart-gen-action-btn'
                    onClick={() => onInsert(guard('!situation'))}>
                    If none
                </button>
            </div>
            <div className='smart-gen-actions'>
                <span className='smart-gen-group-label'>Set</span>
                <button className='smart-gen-action-btn' disabled={!sitName}
                    onClick={() => onInsert(`state.situation = ${JSON.stringify(sitName)}`)}>
                    Activate
                </button>
                <button className='smart-gen-action-btn'
                    onClick={() => onInsert('state.situation = undefined')}>
                    Clear
                </button>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------------
// Container
// ----------------------------------------------------------------------------
const SmartCodeGenerators: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert }) => {
    const [active, setActive] = useState<GeneratorKind | null>(null);

    const toggle = (k: GeneratorKind) => setActive(prev => (prev === k ? null : k));

    return (
        <div className='smart-gen' data-testid='smart-code-generators'>
            <div className='smart-gen-toolbar'>
                <span className='smart-gen-title'>Smart generators</span>
                <button className={`smart-gen-tab${active === 'quest' ? ' active' : ''}`} onClick={() => toggle('quest')}>Quest lifecycle</button>
                <button className={`smart-gen-tab${active === 'fact' ? ' active' : ''}`} onClick={() => toggle('fact')}>Facts</button>
                <button className={`smart-gen-tab${active === 'item' ? ' active' : ''}`} onClick={() => toggle('item')}>Items</button>
                <button className={`smart-gen-tab${active === 'situation' ? ' active' : ''}`} onClick={() => toggle('situation')}>Situation</button>
            </div>
            {active === 'quest' && <QuestCodeBuilder game={game} onInsert={onInsert} />}
            {active === 'fact' && <FactCodeBuilder game={game} onInsert={onInsert} />}
            {active === 'item' && <ItemCodeBuilder game={game} onInsert={onInsert} />}
            {active === 'situation' && <SituationCodeBuilder game={game} onInsert={onInsert} />}
        </div>
    );
};

export default SmartCodeGenerators;
