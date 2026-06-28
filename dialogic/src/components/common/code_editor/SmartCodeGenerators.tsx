import React, { useState } from 'react';
import { Button, ButtonGroup, Input, InputNumber, InputPicker, SelectPicker } from 'rsuite';
import { GameDescription } from '../../../game/GameDescription';
import Prop, { createBoolProp, createNumberProp, createStringProp } from '../../../game/Prop';
import './SmartCodeGenerators.css';

interface SmartCodeGeneratorsProps {
    game: GameDescription;
    onInsert: (snippet: string) => void;
    onAddSituation?: (name: string) => void;
    onAddFact?: (uid: string) => void;
    onAddItem?: (uid: string) => void;
    onAddProp?: (prop: Prop) => void;
}

type GeneratorKind = 'quest' | 'fact' | 'item' | 'prop' | 'situation';

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
const FactCodeBuilder: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert, onAddFact }) => {
    const [factUid, setFactUid] = useState<string | null>(null);

    const factData = game.facts.map(f => ({ label: f.short || f.uid, value: f.uid }));
    const base = factUid ? access('facts', factUid) : '';

    const onCreate = (value: string) => {
        onAddFact?.(value);
        setFactUid(value);
    };

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <InputPicker
                    size='sm'
                    placeholder='Select or type a new fact id'
                    data={factData}
                    value={factUid}
                    onChange={setFactUid}
                    creatable={!!onAddFact}
                    onCreate={onCreate}
                    style={{ width: 240 }}
                />
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
const ItemCodeBuilder: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert, onAddItem }) => {
    const [itemUid, setItemUid] = useState<string | null>(null);
    const [op, setOp] = useState<'add' | 'remove'>('add');
    const [qty, setQty] = useState<number>(1);

    const count = Math.max(1, Math.floor(qty || 1));
    const itemArg = itemUid ? JSON.stringify(itemUid) : "''";
    const mutation = count > 1 ? `items.${op}(${itemArg}, ${count})` : `items.${op}(${itemArg})`;

    const itemData = game.items.map(it => ({ label: it.name || it.uid, value: it.uid }));
    const onCreate = (value: string) => {
        onAddItem?.(value);
        setItemUid(value);
    };

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <InputPicker
                    size='sm'
                    placeholder='Select or type a new item id'
                    data={itemData}
                    value={itemUid}
                    onChange={setItemUid}
                    creatable={!!onAddItem}
                    onCreate={onCreate}
                    style={{ width: 200 }}
                />
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
const SituationCodeBuilder: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert, onAddSituation }) => {
    const [sitName, setSitName] = useState<string | null>(null);

    const sitData = game.situations.map(s => ({ label: s, value: s }));

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <InputPicker
                    size='sm'
                    placeholder='Situation'
                    data={sitData}
                    value={sitName}
                    onChange={setSitName}
                    creatable={!!onAddSituation}
                    onCreate={(value) => onAddSituation?.(value)}
                    style={{ width: 200 }}
                />
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
// Properties (props) read / write builder
// ----------------------------------------------------------------------------
type NewPropType = 'number' | 'boolean' | 'string';

const PropCodeBuilder: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert, onAddProp }) => {
    const [propName, setPropName] = useState<string | null>(null);
    const [newName, setNewName] = useState<string>('');
    const [newType, setNewType] = useState<NewPropType>('number');

    const propData = game.props.map(p => ({ label: `${p.name} (${p.datatype})`, value: p.name }));
    const prop = game.props.find(p => p.name === propName) ?? null;
    const base = prop ? access('props', prop.name) : '';

    const createNew = () => {
        const name = newName.trim();
        if (!name || !onAddProp) return;
        if (!game.props.some(p => p.name === name)) {
            const created =
                newType === 'boolean' ? createBoolProp(name, false)
                    : newType === 'string' ? createStringProp(name, '')
                        : createNumberProp(name, 0);
            onAddProp(created);
        }
        setPropName(name);
        setNewName('');
    };

    // Set / check snippets tailored to the property's datatype.
    const setActions: [string, string][] = !prop ? [] :
        prop.datatype === 'number' ? [['= 0', `${base} = 0`], ['+ 1', `${base} += 1`], ['- 1', `${base} -= 1`]]
            : prop.datatype === 'boolean' ? [['true', `${base} = true`], ['false', `${base} = false`], ['toggle', `${base} = !${base}`]]
                : prop.datatype === 'variant' ? prop.variants.map(v => [`= ${v}`, `${base} = ${JSON.stringify(v)}`] as [string, string])
                    : [["= ''", `${base} = ''`]];

    const checkActions: [string, string][] = !prop ? [] :
        prop.datatype === 'number' ? [['If > 0', `${base} > 0`], ['If === 0', `${base} === 0`]]
            : prop.datatype === 'boolean' ? [['If true', base], ['If false', `!${base}`]]
                : prop.datatype === 'variant' ? prop.variants.map(v => [`If = ${v}`, `${base} === ${JSON.stringify(v)}`] as [string, string])
                    : [["If empty", `${base} === ''`], ['If not empty', `${base} !== ''`]];

    return (
        <div className='smart-gen-body'>
            <div className='smart-gen-row'>
                <SelectPicker size='sm' placeholder='Property' data={propData} value={propName} onChange={setPropName} style={{ width: 200 }} />
            </div>
            {onAddProp &&
                <div className='smart-gen-row'>
                    <Input size='sm' placeholder='New property name' value={newName} onChange={setNewName} style={{ width: 170 }} />
                    <SelectPicker size='sm' cleanable={false} searchable={false} value={newType} onChange={v => v && setNewType(v as NewPropType)}
                        data={[{ label: 'Number', value: 'number' }, { label: 'Boolean', value: 'boolean' }, { label: 'Text', value: 'string' }]} style={{ width: 120 }} />
                    <button className='smart-gen-action-btn' disabled={!newName.trim()} onClick={createNew}>Create property</button>
                </div>}

            {prop && (
                <>
                    <code className='smart-gen-path'>{base}</code>
                    <div className='smart-gen-actions'>
                        <span className='smart-gen-group-label'>Set</span>
                        {setActions.map(([label, code]) => (
                            <button key={label} className='smart-gen-action-btn' onClick={() => onInsert(code)}>{label}</button>
                        ))}
                    </div>
                    <div className='smart-gen-actions'>
                        <span className='smart-gen-group-label'>Check</span>
                        {checkActions.map(([label, expr]) => (
                            <button key={label} className='smart-gen-action-btn' onClick={() => onInsert(guard(expr))}>{label}</button>
                        ))}
                    </div>
                </>
            )}
            {!prop && <p className='smart-gen-hint'>Pick or create a property to generate code.</p>}
        </div>
    );
};

// ----------------------------------------------------------------------------
// Container
// ----------------------------------------------------------------------------
const SmartCodeGenerators: React.FC<SmartCodeGeneratorsProps> = ({ game, onInsert, onAddSituation, onAddFact, onAddItem, onAddProp }) => {
    const [active, setActive] = useState<GeneratorKind | null>(null);

    const toggle = (k: GeneratorKind) => setActive(prev => (prev === k ? null : k));

    return (
        <div className='smart-gen' data-testid='smart-code-generators'>
            <div className='smart-gen-toolbar'>
                <span className='smart-gen-title'>Smart generators</span>
                <button className={`smart-gen-tab${active === 'quest' ? ' active' : ''}`} onClick={() => toggle('quest')}>Quest lifecycle</button>
                <button className={`smart-gen-tab${active === 'fact' ? ' active' : ''}`} onClick={() => toggle('fact')}>Facts</button>
                <button className={`smart-gen-tab${active === 'item' ? ' active' : ''}`} onClick={() => toggle('item')}>Items</button>
                <button className={`smart-gen-tab${active === 'prop' ? ' active' : ''}`} onClick={() => toggle('prop')}>Properties</button>
                <button className={`smart-gen-tab${active === 'situation' ? ' active' : ''}`} onClick={() => toggle('situation')}>Situation</button>
            </div>
            {active === 'quest' && <QuestCodeBuilder game={game} onInsert={onInsert} />}
            {active === 'fact' && <FactCodeBuilder game={game} onInsert={onInsert} onAddFact={onAddFact} />}
            {active === 'item' && <ItemCodeBuilder game={game} onInsert={onInsert} onAddItem={onAddItem} />}
            {active === 'prop' && <PropCodeBuilder game={game} onInsert={onInsert} onAddProp={onAddProp} />}
            {active === 'situation' && <SituationCodeBuilder game={game} onInsert={onInsert} onAddSituation={onAddSituation} />}
        </div>
    );
};

export default SmartCodeGenerators;
