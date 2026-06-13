import React, { useEffect, useMemo, useState } from 'react';
import { Button, Divider, Drawer, IconButton, Input, Message } from 'rsuite';
import PlusRoundIcon from '@rsuite/icons/PlusRound';
import CodeSampleButton from '../../common/CodeSampleButton';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import { GameDescription } from '../../../game/GameDescription';
import { ScriptFunction, createEmptyScriptFunction, isValidFunctionName } from '../../../game/ScriptFunction';

interface FunctionsEditorTabProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
}

const FunctionsEditorTab: React.FC<FunctionsEditorTabProps> = ({ game, onSetGame }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1)
    const [draft, setDraft] = useState<ScriptFunction>(createEmptyScriptFunction())
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false)

    const functions = game.functions ?? []

    useEffect(() => {
        if (editingIndex >= 0 && editingIndex < functions.length) {
            setDraft({ ...functions[editingIndex] })
        }
    // functions identity changes when game updates; intentionally only re-sync on index change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingIndex])

    // Code editor UI: expose the function's own parameters in the doc list too.
    const editorUi = useMemo<PopupCodeEditorUi>(() => {
        const paramArgs: { [key: string]: string } = {}
        draft.args.split(',').map(a => a.trim()).filter(Boolean).forEach(p => {
            paramArgs[p] = `function parameter "${p}"`
        })
        return {
            arguments: { ...DEFAULT_ARGS, ...paramArgs },
            functionName: draft.name || 'reusableFunction',
            functionTemplates: {
                "empty": "",
                "return value": "return true;",
            },
            header: `Function body: ${draft.name || 'unnamed'}`,
        }
    }, [draft.args, draft.name])

    const openEdit = (i: number) => {
        setEditingIndex(i)
        setDraft({ ...functions[i] })
    }

    const closeEdit = (save: boolean) => {
        if (save && editingIndex >= 0) {
            const updated = [...functions]
            updated[editingIndex] = draft
            onSetGame({ ...game, functions: updated })
        }
        setEditingIndex(-1)
    }

    const addFunction = () => {
        const updated = [...functions, createEmptyScriptFunction()]
        onSetGame({ ...game, functions: updated })
        setEditingIndex(updated.length - 1)
        setDraft(createEmptyScriptFunction())
    }

    const deleteFunction = (i: number) => {
        const updated = [...functions]
        updated.splice(i, 1)
        setEditingIndex(-1)
        onSetGame({ ...game, functions: updated })
    }

    const nameError = (() => {
        if (!draft.name) return null
        if (!isValidFunctionName(draft.name)) {
            return "Not a valid identifier — use letters, digits, _ or $ (cannot start with a digit). This function will be ignored at runtime."
        }
        const clash = functions.some((f, i) => i !== editingIndex && f.name === draft.name)
        if (clash) return "Another function already uses this name."
        return null
    })()

    const renderList = () => {
        if (functions.length === 0) {
            return <p style={{ marginLeft: 8, marginTop: 8, opacity: 0.5 }}>No functions yet. Click "Add function" to create a reusable function callable from any script.</p>
        }
        return functions.map((f, i) => (
            <div
                key={i}
                data-testid={`function-item-${i}`}
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
                <strong style={{ fontFamily: "monospace" }}>
                    {f.name ? `${f.name}(${f.args})` : <em style={{ opacity: 0.5 }}>unnamed</em>}
                </strong>
                <p style={{ margin: 0, fontSize: "0.82em", opacity: 0.7 }}>
                    {f.description || <em>no description</em>}
                </p>
            </div>
        ))
    }

    const renderDrawer = () => {
        const isOpen = editingIndex >= 0 && editingIndex < functions.length

        return (
            <Drawer placement="right" size="md" open={isOpen} onClose={() => closeEdit(true)}>
                <Drawer.Header>
                    <Drawer.Title>Edit function</Drawer.Title>
                    <Drawer.Actions>
                        <ConfirmDeleteButton onConfirm={() => deleteFunction(editingIndex)} objectDescr="function" />
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
                                    data-testid="function-name-input"
                                    value={draft.name}
                                    onChange={v => setDraft(d => ({ ...d, name: v }))}
                                    placeholder="e.g. addScore"
                                    style={{ fontFamily: "monospace" }}
                                />
                                {nameError && (
                                    <Message type="warning" showIcon style={{ marginTop: 6 }}>{nameError}</Message>
                                )}
                            </div>

                            <div>
                                <p style={{ marginBottom: 4 }}>Parameters</p>
                                <Input
                                    data-testid="function-args-input"
                                    value={draft.args}
                                    onChange={v => setDraft(d => ({ ...d, args: v }))}
                                    placeholder="comma-separated, e.g. amount, reason"
                                    style={{ fontFamily: "monospace" }}
                                />
                            </div>

                            <div>
                                <p style={{ marginBottom: 4 }}>Description</p>
                                <Input
                                    data-testid="function-description-input"
                                    value={draft.description}
                                    onChange={v => setDraft(d => ({ ...d, description: v }))}
                                    placeholder="What does this function do?"
                                />
                            </div>

                            <Divider>Function body</Divider>
                            <p style={{ margin: 0, fontSize: "0.82em", opacity: 0.7 }}>
                                The body runs with access to <code>rt</code>, <code>state</code>, <code>props</code>,{' '}
                                <code>ch</code>, <code>facts</code>, <code>objectives</code>, <code>items</code> and your
                                parameters. Use <code>return</code> to produce a value.
                            </p>

                            <div>
                                <CodeSampleButton
                                    name="body"
                                    code={draft.body}
                                    onClick={() => setCodeEditorOpen(true)}
                                />
                                <PopupCodeEditor
                                    game={game}
                                    ui={editorUi}
                                    code={draft.body}
                                    open={codeEditorOpen}
                                    onSaveClose={v => {
                                        setDraft(d => ({ ...d, body: v }))
                                        setCodeEditorOpen(false)
                                    }}
                                    onAddSituation={s => onSetGame({ ...game, situations: [...game.situations, s] })}
                                />
                            </div>
                        </div>
                    )}
                </Drawer.Body>
            </Drawer>
        )
    }

    return (
        <div data-testid="functions-editor-tab">
            <p style={{ marginLeft: 8, marginTop: 8, marginBottom: 8, opacity: 0.7 }}>
                Reusable functions are injected into the scope of every script, so you can call them by name from any
                entry / action / visibility script, hook or event.
            </p>
            <div style={{ marginLeft: 8 }}>
                <IconButton icon={<PlusRoundIcon />} onClick={addFunction}>Add function</IconButton>
            </div>
            {renderList()}
            {renderDrawer()}
        </div>
    )
}

export default FunctionsEditorTab
