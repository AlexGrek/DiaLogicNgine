import lodash from 'lodash';
import React from 'react';
import { Button, IconButton, Input, InputNumber, InputPicker, Panel, SelectPicker, TagPicker, Toggle } from 'rsuite';
import PlusIcon from '@rsuite/icons/Plus';
import TrashIcon from '@rsuite/icons/Trash';
import {
    CarriedItem,
    CharDialogID,
    DialogWindowId,
    InGameNotification,
    InGameNotificationType,
    LocationID,
    State,
    UiObjectId,
} from '../../exec/GameState';
import { GameProgress } from '../../exec/GameProgress';
import { GameDescription } from '../../game/GameDescription';
import { QuestPath, TaskPath } from '../../game/Objectives';
import {
    charOptions,
    decodeQuestPath,
    decodeTaskPath,
    dialogOptions,
    encodePath,
    eventOptions,
    factOptions,
    itemOptions,
    locOptions,
    Option,
    questLineOptions,
    questOptions,
    situationOptions,
    taskOptions,
    windowOptions,
} from './stateEditorOptions';

interface StateEditorProps {
    state: State;
    game: GameDescription;
    onStateChange: (state: State) => void;
}

// --- small layout helpers --------------------------------------------------

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div className='state-editor-field'>
        <label className='state-editor-label'>{label}</label>
        {hint ? <div className='state-editor-hint'>{hint}</div> : null}
        <div className='state-editor-control'>{children}</div>
    </div>
);

// --- UiObjectId (position) editing -----------------------------------------

const KIND_OPTIONS: Option[] = [
    { label: 'Dialog window', value: 'window' },
    { label: 'Location', value: 'location' },
    { label: 'Character dialog', value: 'chardialog' },
];

function defaultForKind(game: GameDescription, kind: UiObjectId['kind']): UiObjectId {
    if (kind === 'window') {
        const dialog = game.dialogs[0]?.name ?? '';
        const window = game.dialogs[0]?.windows[0]?.uid ?? '';
        return { kind: 'window', dialog, window } as DialogWindowId;
    }
    if (kind === 'location') {
        return { kind: 'location', location: game.locs[0]?.uid ?? '' } as LocationID;
    }
    return { kind: 'chardialog', char: game.chars[0]?.uid ?? '' } as CharDialogID;
}

const UiObjectIdEditor: React.FC<{
    game: GameDescription;
    value: UiObjectId;
    onChange: (value: UiObjectId) => void;
}> = ({ game, value, onChange }) => {
    return (
        <div className='state-editor-uiobject'>
            <SelectPicker
                cleanable={false}
                searchable={false}
                size='sm'
                data={KIND_OPTIONS}
                value={value.kind}
                onChange={(k) => k && onChange(defaultForKind(game, k as UiObjectId['kind']))}
                style={{ width: 160 }}
            />
            {value.kind === 'window' && (
                <>
                    <SelectPicker
                        size='sm'
                        placeholder='dialog'
                        data={dialogOptions(game)}
                        value={value.dialog}
                        onChange={(d) => d !== null && onChange({ ...value, dialog: d, window: '' })}
                        style={{ width: 160 }}
                    />
                    <SelectPicker
                        size='sm'
                        placeholder='window'
                        data={windowOptions(game, value.dialog)}
                        value={value.window}
                        onChange={(w) => w !== null && onChange({ ...value, window: w })}
                        style={{ width: 160 }}
                    />
                </>
            )}
            {value.kind === 'location' && (
                <SelectPicker
                    size='sm'
                    placeholder='location'
                    data={locOptions(game)}
                    value={value.location}
                    onChange={(l) => l !== null && onChange({ ...value, location: l })}
                    style={{ width: 220 }}
                />
            )}
            {value.kind === 'chardialog' && (
                <SelectPicker
                    size='sm'
                    placeholder='character'
                    data={charOptions(game)}
                    value={value.char}
                    onChange={(c) => c !== null && onChange({ ...value, char: c })}
                    style={{ width: 220 }}
                />
            )}
        </div>
    );
};

const UiObjectIdListEditor: React.FC<{
    game: GameDescription;
    value: UiObjectId[];
    onChange: (value: UiObjectId[]) => void;
}> = ({ game, value, onChange }) => {
    const updateAt = (i: number, v: UiObjectId) => onChange(value.map((x, idx) => (idx === i ? v : x)));
    const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));
    const add = () => onChange([...value, defaultForKind(game, 'window')]);
    return (
        <div className='state-editor-list'>
            {value.map((entry, i) => (
                <div key={i} className='state-editor-list-row'>
                    <span className='state-editor-index'>{i}</span>
                    <UiObjectIdEditor game={game} value={entry} onChange={(v) => updateAt(i, v)} />
                    <IconButton size='sm' icon={<TrashIcon />} onClick={() => removeAt(i)} />
                </div>
            ))}
            <Button size='sm' appearance='ghost' startIcon={<PlusIcon />} onClick={add}>
                Add entry
            </Button>
        </div>
    );
};

// --- props editing ----------------------------------------------------------

const PropsEditor: React.FC<{
    game: GameDescription;
    value: { [key: string]: string | number | boolean };
    onChange: (value: { [key: string]: string | number | boolean }) => void;
}> = ({ game, value, onChange }) => {
    const setKey = (key: string, v: string | number | boolean) => onChange({ ...value, [key]: v });
    const removeKey = (key: string) => {
        const next = { ...value };
        delete next[key];
        onChange(next);
    };

    // Props that are declared in the game but not yet present in state.
    const missing = game.props.filter((p) => !(p.name in value));

    const renderControl = (key: string) => {
        const decl = game.props.find((p) => p.name === key);
        const current = value[key];
        if (decl?.datatype === 'boolean' || typeof current === 'boolean') {
            return <Toggle checked={Boolean(current)} onChange={(c) => setKey(key, c)} />;
        }
        if (decl?.datatype === 'number' || typeof current === 'number') {
            return (
                <InputNumber
                    size='sm'
                    value={current as number}
                    onChange={(v) => setKey(key, v === null || v === '' ? 0 : Number(v))}
                    style={{ width: 160 }}
                />
            );
        }
        if (decl?.datatype === 'variant') {
            return (
                <InputPicker
                    size='sm'
                    creatable
                    data={decl.variants.map((v) => ({ label: v, value: v }))}
                    value={String(current ?? '')}
                    onChange={(v) => v !== null && setKey(key, v)}
                    style={{ width: 220 }}
                />
            );
        }
        if (decl?.datatype === 'location') {
            return (
                <SelectPicker
                    size='sm'
                    data={locOptions(game)}
                    value={String(current ?? '')}
                    onChange={(v) => v !== null && setKey(key, v)}
                    style={{ width: 220 }}
                />
            );
        }
        return (
            <Input size='sm' value={String(current ?? '')} onChange={(v) => setKey(key, v)} style={{ width: 220 }} />
        );
    };

    return (
        <div className='state-editor-list'>
            {Object.keys(value).map((key) => (
                <div key={key} className='state-editor-list-row'>
                    <span className='state-editor-propkey'>{key}</span>
                    {renderControl(key)}
                    <IconButton size='sm' icon={<TrashIcon />} onClick={() => removeKey(key)} />
                </div>
            ))}
            {missing.length > 0 && (
                <div className='state-editor-add-prop'>
                    <SelectPicker
                        size='sm'
                        placeholder='Add declared prop…'
                        data={missing.map((p) => ({ label: `${p.name} (${p.datatype})`, value: p.name }))}
                        value={null}
                        onChange={(name) => {
                            if (!name) return;
                            const decl = game.props.find((p) => p.name === name)!;
                            setKey(name, decl.defaultValue as string | number | boolean);
                        }}
                        style={{ width: 260 }}
                    />
                </div>
            )}
        </div>
    );
};

// --- progress editing -------------------------------------------------------

const PathTagField: React.FC<{
    label: string;
    options: Option[];
    value: string[][];
    decode: (v: string) => string[];
    onChange: (value: string[][]) => void;
}> = ({ label, options, value, decode, onChange }) => (
    <Field label={label}>
        <TagPicker
            block
            data={options}
            value={value.map(encodePath)}
            onChange={(vals) => onChange((vals ?? []).map(decode))}
        />
    </Field>
);

const ProgressEditor: React.FC<{
    game: GameDescription;
    value: GameProgress;
    onChange: (value: GameProgress) => void;
}> = ({ game, value, onChange }) => {
    const tasks = taskOptions(game);
    const quests = questOptions(game);
    const lines = questLineOptions(game);
    const set = (patch: Partial<GameProgress>) => onChange({ ...value, ...patch });
    const taskField = (label: string, key: keyof GameProgress) => (
        <PathTagField
            label={label}
            options={tasks}
            value={value[key] as TaskPath[]}
            decode={decodeTaskPath}
            onChange={(v) => set({ [key]: v as TaskPath[] })}
        />
    );
    const questField = (label: string, key: keyof GameProgress) => (
        <PathTagField
            label={label}
            options={quests}
            value={value[key] as QuestPath[]}
            decode={decodeQuestPath}
            onChange={(v) => set({ [key]: v as QuestPath[] })}
        />
    );
    return (
        <div>
            {taskField('Open tasks', 'openTasks')}
            {taskField('Completed tasks', 'completedTasks')}
            {taskField('Failed tasks', 'failedTasks')}
            {questField('Open quests', 'openQuests')}
            {questField('Completed quests', 'completedQuests')}
            {questField('Failed quests', 'failedQuests')}
            <Field label='Open quest lines'>
                <TagPicker block data={lines} value={value.openQuestLines}
                    onChange={(v) => set({ openQuestLines: v ?? [] })} />
            </Field>
            <Field label='Closed quest lines'>
                <TagPicker block data={lines} value={value.closedQuestLines}
                    onChange={(v) => set({ closedQuestLines: v ?? [] })} />
            </Field>
        </div>
    );
};

// --- carried items ----------------------------------------------------------

const CarriedItemsEditor: React.FC<{
    game: GameDescription;
    value: CarriedItem[];
    onChange: (value: CarriedItem[]) => void;
}> = ({ game, value, onChange }) => {
    const items = itemOptions(game);
    const updateAt = (i: number, v: CarriedItem) => onChange(value.map((x, idx) => (idx === i ? v : x)));
    const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));
    const add = () => onChange([...value, { item: game.items[0]?.uid ?? '', quantity: 1 }]);
    return (
        <div className='state-editor-list'>
            {value.map((entry, i) => (
                <div key={i} className='state-editor-list-row'>
                    <InputPicker
                        size='sm'
                        creatable
                        data={items}
                        value={entry.item}
                        onChange={(v) => v !== null && updateAt(i, { ...entry, item: v })}
                        style={{ width: 220 }}
                    />
                    <InputNumber
                        size='sm'
                        min={0}
                        value={entry.quantity}
                        onChange={(v) => updateAt(i, { ...entry, quantity: v === null || v === '' ? 0 : Number(v) })}
                        style={{ width: 110 }}
                    />
                    <IconButton size='sm' icon={<TrashIcon />} onClick={() => removeAt(i)} />
                </div>
            ))}
            <Button size='sm' appearance='ghost' startIcon={<PlusIcon />} onClick={add}>
                Add item
            </Button>
        </div>
    );
};

// --- notifications ----------------------------------------------------------

const NOTIFICATION_TYPES: InGameNotificationType[] = [
    'questnew', 'questfailed', 'questcompleted', 'questprogress',
    'questlineopen', 'questlineclose', 'itemadded', 'itemremoved',
];

const NotificationsEditor: React.FC<{
    value: InGameNotification[];
    onChange: (value: InGameNotification[]) => void;
}> = ({ value, onChange }) => {
    const updateAt = (i: number, v: InGameNotification) => onChange(value.map((x, idx) => (idx === i ? v : x)));
    const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));
    const add = () => onChange([...value, { type: 'questprogress', text: '' }]);
    return (
        <div className='state-editor-list'>
            {value.map((entry, i) => (
                <div key={i} className='state-editor-list-row'>
                    <SelectPicker
                        size='sm'
                        cleanable={false}
                        searchable={false}
                        data={NOTIFICATION_TYPES.map((t) => ({ label: t, value: t }))}
                        value={entry.type}
                        onChange={(t) => t && updateAt(i, { ...entry, type: t as InGameNotificationType })}
                        style={{ width: 160 }}
                    />
                    <Input size='sm' placeholder='text' value={entry.text}
                        onChange={(t) => updateAt(i, { ...entry, text: t })} style={{ width: 220 }} />
                    <Input size='sm' placeholder='item (optional)' value={entry.item ?? ''}
                        onChange={(t) => updateAt(i, { ...entry, item: t || undefined })} style={{ width: 160 }} />
                    <IconButton size='sm' icon={<TrashIcon />} onClick={() => removeAt(i)} />
                </div>
            ))}
            <Button size='sm' appearance='ghost' startIcon={<PlusIcon />} onClick={add}>
                Add notification
            </Button>
        </div>
    );
};

// --- short history ----------------------------------------------------------

const ShortHistoryEditor: React.FC<{
    value: State['shortHistory'];
    onChange: (value: State['shortHistory']) => void;
}> = ({ value, onChange }) => {
    const updateAt = (i: number, v: State['shortHistory'][number]) =>
        onChange(value.map((x, idx) => (idx === i ? v : x)));
    const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));
    const add = () => onChange([...value, { text: '', answer: '', step: 0 }]);
    return (
        <div className='state-editor-list'>
            {value.map((entry, i) => (
                <div key={i} className='state-editor-list-row state-editor-history-row'>
                    <Input size='sm' placeholder='actor' value={entry.actor ?? ''}
                        onChange={(t) => updateAt(i, { ...entry, actor: t || undefined })} style={{ width: 120 }} />
                    <Input size='sm' placeholder='text' value={entry.text}
                        onChange={(t) => updateAt(i, { ...entry, text: t })} style={{ width: 200 }} />
                    <Input size='sm' placeholder='answer' value={entry.answer}
                        onChange={(t) => updateAt(i, { ...entry, answer: t })} style={{ width: 200 }} />
                    <InputNumber size='sm' value={entry.step}
                        onChange={(v) => updateAt(i, { ...entry, step: v === null || v === '' ? 0 : Number(v) })}
                        style={{ width: 90 }} />
                    <IconButton size='sm' icon={<TrashIcon />} onClick={() => removeAt(i)} />
                </div>
            ))}
            <Button size='sm' appearance='ghost' startIcon={<PlusIcon />} onClick={add}>
                Add record
            </Button>
        </div>
    );
};

// --- main editor ------------------------------------------------------------

const StateEditor: React.FC<StateEditorProps> = ({ state, game, onStateChange }) => {
    // Each update produces a fresh top-level object so React picks up the change.
    const update = (patch: Partial<State>) => onStateChange({ ...state, ...patch });

    return (
        <div className='state-editor'>
            <Panel header='Position & navigation' bordered defaultExpanded collapsible>
                <Field label='Current position'>
                    <UiObjectIdEditor game={game} value={state.position} onChange={(v) => update({ position: v })} />
                </Field>
                <Field label='Step count'>
                    <InputNumber size='sm' value={state.stepCount}
                        onChange={(v) => update({ stepCount: v === null || v === '' ? 0 : Number(v) })}
                        style={{ width: 160 }} />
                </Field>
                <Field label='Dialog page'>
                    <InputNumber size='sm' value={state.dialogPage}
                        onChange={(v) => update({ dialogPage: v === null || v === '' ? 0 : Number(v) })}
                        style={{ width: 160 }} />
                </Field>
                <Field label='Position stack' hint='LIFO stack used by push/pop links'>
                    <UiObjectIdListEditor game={game} value={state.positionStack}
                        onChange={(v) => update({ positionStack: v })} />
                </Field>
                <Field label='Position history'>
                    <UiObjectIdListEditor game={game} value={state.positionHistory}
                        onChange={(v) => update({ positionHistory: v })} />
                </Field>
            </Panel>

            <Panel header='Location & character' bordered defaultExpanded collapsible>
                <Field label='Current location'>
                    <SelectPicker block data={locOptions(game)} value={state.location}
                        onChange={(v) => update({ location: v })} />
                </Field>
                <Field label='Current character dialog'>
                    <SelectPicker block data={charOptions(game)} value={state.charDialog}
                        onChange={(v) => update({ charDialog: v })} />
                </Field>
                <Field label='Situation'>
                    <InputPicker block creatable data={situationOptions(game)} value={state.situation ?? null}
                        onChange={(v) => update({ situation: v ?? undefined })} />
                </Field>
                <Field label='Background' hint='Background image url/id override'>
                    <Input size='sm' value={state.background ?? ''}
                        onChange={(v) => update({ background: v || undefined })} />
                </Field>
                <Field label='Quick reply text'>
                    <Input size='sm' value={state.quickReplyText ?? ''}
                        onChange={(v) => update({ quickReplyText: v || null })} />
                </Field>
            </Panel>

            <Panel header='Props' bordered defaultExpanded collapsible>
                <PropsEditor game={game} value={state.props} onChange={(v) => update({ props: v })} />
            </Panel>

            <Panel header='Knowledge' bordered collapsible>
                <Field label='Known facts'>
                    <TagPicker block data={factOptions(game)} value={state.knownFacts}
                        onChange={(v) => update({ knownFacts: v ?? [] })} />
                </Field>
                <Field label='Known people'>
                    <TagPicker block data={charOptions(game)} value={state.knownPeople}
                        onChange={(v) => update({ knownPeople: v ?? [] })} />
                </Field>
                <Field label='Known places'>
                    <TagPicker block data={locOptions(game)} value={state.knownPlaces}
                        onChange={(v) => update({ knownPlaces: v ?? [] })} />
                </Field>
                <Field label='Happened events'>
                    <TagPicker block creatable data={eventOptions(game)} value={state.happenedEvents}
                        onChange={(v) => update({ happenedEvents: v ?? [] })} />
                </Field>
            </Panel>

            <Panel header='Inventory' bordered collapsible>
                <CarriedItemsEditor game={game} value={state.carriedItems}
                    onChange={(v) => update({ carriedItems: v })} />
            </Panel>

            <Panel header='Quest progress' bordered collapsible>
                <ProgressEditor game={game} value={state.progress} onChange={(v) => update({ progress: v })} />
            </Panel>

            <Panel header='Notifications' bordered collapsible>
                <NotificationsEditor value={state.notifications} onChange={(v) => update({ notifications: v })} />
            </Panel>

            <Panel header='Short history' bordered collapsible>
                <ShortHistoryEditor value={state.shortHistory} onChange={(v) => update({ shortHistory: v })} />
            </Panel>

            <Panel header='Advanced' bordered collapsible>
                <Field label='Game version'>
                    <Input size='sm' value={state.gameVersion} onChange={(v) => update({ gameVersion: v })} />
                </Field>
                <Field label='Engine version'>
                    <Input size='sm' value={state.engineVersion} onChange={(v) => update({ engineVersion: v })} />
                </Field>
                <Field label='Fatal error'>
                    {state.fatalError ? (
                        <div className='state-editor-list-row'>
                            <code className='state-editor-fatal'>{state.fatalError.message}</code>
                            <Button size='sm' onClick={() => update({ fatalError: null })}>Clear</Button>
                        </div>
                    ) : (
                        <span className='state-editor-hint'>none</span>
                    )}
                </Field>
            </Panel>

            <Button
                appearance='subtle'
                size='sm'
                style={{ marginTop: 12 }}
                onClick={() => onStateChange(lodash.cloneDeep(state))}
            >
                Force refresh
            </Button>
        </div>
    );
};

export default StateEditor;
