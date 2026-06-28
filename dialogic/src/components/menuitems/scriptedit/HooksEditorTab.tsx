import React, { useEffect, useState } from 'react';
import { Button, Divider, Drawer, IconButton, Input } from 'rsuite';
import PlusRoundIcon from '@rsuite/icons/PlusRound';
import CodeSampleButton from '../../common/CodeSampleButton';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import SmartHookPicker from '../../common/SmartHookPicker';
import { GameDescription } from '../../../game/GameDescription';
import { HookScript, createEmptyHookScript } from '../../../game/HookScript';
import { createEmptyFact } from '../../../game/Fact';
import { createEmptyItem } from '../../../game/Items';

const HOOK_EDITOR_UI: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    functionName: "hookScript",
    functionTemplates: {
        "empty": "",
        "log": "console.log('hook fired');",
    },
    header: "Hook script editor",
}

interface HooksEditorTabProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
}

const HooksEditorTab: React.FC<HooksEditorTabProps> = ({ game, onSetGame }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1)
    const [draft, setDraft] = useState<HookScript>(createEmptyHookScript())
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false)

    const hooks = game.hooks ?? []

    useEffect(() => {
        if (editingIndex >= 0 && editingIndex < hooks.length) {
            setDraft({ ...hooks[editingIndex] })
        }
    // hooks identity changes when game updates; intentionally only re-sync on index change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingIndex])

    const openEdit = (i: number) => {
        setEditingIndex(i)
        setDraft({ ...hooks[i] })
    }

    const closeEdit = (save: boolean) => {
        if (save && editingIndex >= 0) {
            const updated = [...hooks]
            updated[editingIndex] = draft
            onSetGame({ ...game, hooks: updated })
        }
        setEditingIndex(-1)
    }

    const addHook = () => {
        const updated = [...hooks, createEmptyHookScript()]
        onSetGame({ ...game, hooks: updated })
        setEditingIndex(updated.length - 1)
        setDraft(createEmptyHookScript())
    }

    const deleteHook = (i: number) => {
        const updated = [...hooks]
        updated.splice(i, 1)
        setEditingIndex(-1)
        onSetGame({ ...game, hooks: updated })
    }

    const renderList = () => {
        if (hooks.length === 0) {
            return <p style={{ marginLeft: 8, marginTop: 8, opacity: 0.5 }}>No hooks yet. Click "Add hook" to create one.</p>
        }
        return hooks.map((h, i) => (
            <div
                key={i}
                data-testid={`hook-item-${i}`}
                onClick={() => openEdit(i)}
                style={{
                    marginLeft: 8,
                    marginRight: 8,
                    marginTop: 6,
                    padding: "8px 12px",
                    border: "1px solid var(--rs-border-primary, #3c3f43)",
                    borderRadius: 6,
                    cursor: "pointer",
                }}
            >
                <strong>{h.name || <em style={{ opacity: 0.5 }}>unnamed</em>}</strong>
                <p style={{ margin: 0, fontSize: "0.82em", opacity: 0.7, fontFamily: "monospace" }}>
                    {h.hook || <em>no hook set</em>}
                </p>
            </div>
        ))
    }

    const renderDrawer = () => {
        const isOpen = editingIndex >= 0 && editingIndex < hooks.length

        return (
            <Drawer placement="right" size="md" open={isOpen} onClose={() => closeEdit(true)}>
                <Drawer.Header>
                    <Drawer.Title>Edit hook</Drawer.Title>
                    <Drawer.Actions>
                        <ConfirmDeleteButton onConfirm={() => deleteHook(editingIndex)} objectDescr="hook" />
                        <Button onClick={() => closeEdit(false)} appearance="ghost" color="blue">Discard</Button>
                        <Button onClick={() => closeEdit(true)} appearance="primary">Save</Button>
                    </Drawer.Actions>
                </Drawer.Header>
                <Drawer.Body>
                    {isOpen && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 4px" }}>
                            <div>
                                <p style={{ marginBottom: 4 }}>Name</p>
                                <Input
                                    data-testid="hook-name-input"
                                    value={draft.name}
                                    onChange={v => setDraft(d => ({ ...d, name: v }))}
                                    placeholder="e.g. on_secret_discovered"
                                />
                            </div>

                            <Divider>Hook target</Divider>

                            <div>
                                <p style={{ marginBottom: 4 }}>Hook string</p>
                                <Input
                                    data-testid="hook-string-input"
                                    value={draft.hook}
                                    onChange={v => setDraft(d => ({ ...d, hook: v }))}
                                    placeholder="e.g. FACTS::DISCOVERED::top_secret"
                                    style={{ fontFamily: "monospace" }}
                                />
                            </div>

                            <SmartHookPicker
                                game={game}
                                onSelect={hookString => setDraft(d => ({ ...d, hook: hookString }))}
                                onAddSituation={s => onSetGame({ ...game, situations: [...game.situations, s] })}
                            />

                            <Divider>Script body</Divider>

                            <div>
                                <CodeSampleButton
                                    name="body"
                                    code={draft.body}
                                    onClick={() => setCodeEditorOpen(true)}
                                />
                                <PopupCodeEditor
                                    game={game}
                                    ui={HOOK_EDITOR_UI}
                                    code={draft.body}
                                    open={codeEditorOpen}
                                    onSaveClose={v => {
                                        setDraft(d => ({ ...d, body: v }))
                                        setCodeEditorOpen(false)
                                    }}
                                    onAddSituation={s => onSetGame({ ...game, situations: [...game.situations, s] })} onAddFact={uid => onSetGame({ ...game, facts: [...game.facts, createEmptyFact(uid)] })} onAddItem={uid => onSetGame({ ...game, items: [...game.items, createEmptyItem(uid)] })} onAddProp={p => onSetGame({ ...game, props: [...game.props, p] })}
                                />
                            </div>
                        </div>
                    )}
                </Drawer.Body>
            </Drawer>
        )
    }

    return (
        <div data-testid="hooks-editor-tab">
            <div style={{ marginLeft: 8, marginTop: 8 }}>
                <IconButton icon={<PlusRoundIcon />} onClick={addHook}>Add hook</IconButton>
            </div>
            {renderList()}
            {renderDrawer()}
        </div>
    )
}

export default HooksEditorTab
