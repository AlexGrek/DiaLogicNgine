import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'rsuite';
import CodeEditor from '@uiw/react-textarea-code-editor';
import "./PopupCodeEditor.css"
import AccessibleObjects from './AccessibleObjects';
import SmartCodeGenerators from './SmartCodeGenerators';
import { GameDescription } from '../../../game/GameDescription';
import { createRtDoc } from './RtObjectTraverse';
import { mergeDicts } from '../../../Utils';

export interface PopupCodeEditorUi {
    arguments: { [key: string]: string };
    functionName: string;
    functionTemplates: { [key: string]: string }
    header: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_ARGS = {
    "state": "state object, can be modified",
    "state.position": "UiObjectId, current position",
    "state.positionStack": "stacked positions",
    "state.props": "{ [key: string]: number | string }, game properties",
    "state.stepCount": "step counter; +1 per selected choice / navigation, not on subtext paging",
    "rt": "collection of useful runtime functions",
    "props": "all props available as objects",
    "rt.props": "all props available as objects",
    "rt.ch": "all claracters",
    "ch": "all claracters",
    "rt.facts": "all facts",
    "facts": "all facts",
    "objectives": "all quest lines, quests and tasks",
    "rt.objectives": "all quest lines, quests and tasks",
    "situation": "current situation string (or undefined) — read-only snapshot; use state.situation to set",
    "rt.situation": "current situation string (or undefined) — read-only snapshot",
    "rt.step": "current step counter (read-only number); +1 per selected choice / navigation, not on subtext paging",
    "state.situation": "read/write: set to a situation name string or undefined to clear (e.g. state.situation = 'combat')",
    "items": "inventory manager (same as rt.items)",
    "items.add()": "items.add(uid, count=1): add one or more of an item to the inventory",
    "items.remove()": "items.remove(uid, count=1): remove one or more of an item from the inventory",
    "items.has()": "items.has(uid) => boolean: is the item carried",
    "items.count()": "items.count(uid) => number: how many of this item are carried",
    "items.countTotal()": "items.countTotal() => number: total number of carried items",
    "items.list()": "items.list() => CarriedItem[]: all carried items",
    "items.listWithTag()": "items.listWithTag(tag) => CarriedItem[]: carried items having the given tag",
    "rt.items": "inventory manager (same as items)",
    "rt.history": "game history accessor",
    "rt.history.eventHappened()": "rt.history.eventHappened(name) => boolean: has the named event happened",
    "rt.history.thisEventHappened()": "rt.history.thisEventHappened(context) => boolean: has the current event already happened",
    "context": "context variables passed into the script (may be empty)",
    "context.usedItem": "uid of the item used from the inventory in the current dialog window (set when the player presses 'Use' on an item; available in the window entry script)",
    "rt.general": "game general info — read-only; set in Game Configuration → General",
    "rt.general.name": "game name (read-only string)",
    "rt.general.version": "game version string (read-only)",
    "rt.general.description": "game description (read-only)",
    "rt.general.authors": "array of author names (read-only)",
    "rt.general.extras": "additional info key→value map from Game Configuration (read-only)",
}

interface PopupCodeEditorProps {
    code: string;
    ui: PopupCodeEditorUi;
    open: boolean;
    onSaveClose: (c: string) => void;
    game?: GameDescription;
    onAddSituation?: (name: string) => void;
}

const PopupCodeEditor: React.FC<PopupCodeEditorProps> = ({ code, ui, open, onSaveClose, game, onAddSituation }) => {
    const [codeVal, setCode] = useState<string>(code);
    const [docOpenFor, setDocOpenFor] = useState<string | null>(null)
    useEffect(() => {
        setCode(code);
        setDocOpenFor(null);
    }, [code, ui]);

    const rt = () => game ? createRtDoc(game) : null

    const getArguments = () => {
        let args = ui.arguments
        if (game && game.facts.length > 0) {
            game.facts.forEach(fact => {
                const toMerge = {
                    [`facts.${fact.uid}`]: `Fact: ${fact.short}`,
                    [`facts.${fact.uid}.known`]: `boolean prop: is '${fact.short}' fact known`,
                    [`facts.${fact.uid}.know()`]: `Make fact known: ${fact.short}`,
                }
                args = mergeDicts(args, toMerge)
            })
        }

        if (game && game.general?.extras) {
            const extrasEntries: { [key: string]: string } = {}
            for (const [key, val] of Object.entries(game.general.extras)) {
                extrasEntries[`rt.general.extras.${key}`] = `Additional info: ${key} = ${val}`
            }
            args = mergeDicts(args, extrasEntries)
        }

        const rtData = rt()
        if (rtData) {
            return mergeDicts(args, rtData)
        } else {
            return args
        }
    }

    const renderEditor = () => {
        return <CodeEditor value={codeVal} language="js" placeholder="Please enter JS code or leave blank for no action." data-color-mode="dark" minHeight={12} onChange={(evn) => setCode(evn.target.value)}
            padding={12}
            style={{
                fontSize: 13.5,
                backgroundColor: "transparent",
                borderRadius: 10,
                fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
            }} />
    }

    const renderDoc = () => {
        const args = getArguments()
        if (!docOpenFor) {
            return <p>
                Select available object to see it's documentation.
            </p>
        } else {
            return <p>
                <mark>{docOpenFor}</mark><br />
                <span>{docOpenFor in args ? args[docOpenFor] : "missing documentation"}</span>
            </p>
        }
    }

    const accessibleObjectClick = (name: string) => {
        setDocOpenFor(name);
    }

    const accessibleObjectAddClick = (name: string) => {
        setCode(codeVal + name);
    }

    // Append a generated snippet on its own line.
    const insertSnippet = (snippet: string) => {
        setCode(prev => prev.trimEnd().length > 0 ? `${prev.replace(/\s*$/, '')}\n${snippet}` : snippet);
    }

    const renderExamples = () => {
        const applyCodeTemplate = (name: string) => {
            setCode(ui.functionTemplates[name])
        }
        return Object.entries(ui.functionTemplates).map(example => {
            const [name] = example
            return <button className="load-example-btn-code" onClick={() => applyCodeTemplate(name)} key={name}>{name}</button>
        })
    }

    const argumentsCommaSeparated = (argsObj: { [key: string]: string }) => {
        const keys = Object.keys(argsObj)
        const keysRootOnly = keys.filter(val => val.indexOf(".") < 0)
        return keysRootOnly.join(', ')
    }

    return open ? (
        <Modal size={'lg'} open={open} onClose={() => onSaveClose(codeVal)} backdrop="static" className="apple-code-editor">
            <Modal.Header>
                <Modal.Title>{ui.header}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {open && <div className="editor-content-code">
                    <div className='side-panel-code'>
                        <div className='object-navi-code'>
                            <h3 className='micro-header-code'>Available objects</h3>
                            <AccessibleObjects objectDescrMap={getArguments()} onObjectClick={accessibleObjectClick} onAddClick={accessibleObjectAddClick} />
                        </div>
                        <div className='object-docs-code'>
                            {renderDoc()}
                        </div>
                    </div>
                    <div className='editor-right-code'>
                        <div className='editor-panel-code' style={{minHeight: "40vh"}}>
                            function {ui.functionName}({argumentsCommaSeparated(getArguments())}) {"{"}
                            {renderEditor()}
                            {"}"}
                            <br />
                            <br />
                            <span className="load-examples-code">{"// Load examples: "}{renderExamples()}</span>
                        </div>
                        {game && <SmartCodeGenerators game={game} onInsert={insertSnippet} onAddSituation={onAddSituation} />}
                    </div>
                </div>}


            </Modal.Body>
            <Modal.Footer>
                <Button onClick={() => onSaveClose(codeVal)} appearance="primary">
                    Save
                </Button>
            </Modal.Footer>
        </Modal>
    ) : null; // WARNING! Optimization!
};

export default PopupCodeEditor;
