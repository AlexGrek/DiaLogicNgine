import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'rsuite';
import CodeEditor from '@uiw/react-textarea-code-editor';
import "./PopupCodeEditor.css"
import AccessibleObjects from './AccessibleObjects';
import { GameDescription } from '../../../game/GameDescription';
import { createRtDoc } from './RtObjectTraverse';
import { mergeDicts } from '../../../Utils';

export interface PopupCodeEditorUi {
    arguments: { [key: string]: string };
    functionName: string;
    functionTemplates: { [key: string]: string }
    header: string;
}

export const DEFAULT_ARGS = {
    "state": "state object, can be modified",
    "state.position": "UiObjectId, current position",
    "state.positionStack": "stacked positions",
    "state.props": "{ [key: string]: number | string }, game properties",
    "rt": "collection of useful runtime functions",
    "props": "all props available as objects",
    "rt.props": "all props available as objects",
    "rt.ch": "all claracters",
    "ch": "all claracters",
    "rt.facts": "all facts",
    "facts": "all facts"
}

interface PopupCodeEditorProps {
    code: string;
    ui: PopupCodeEditorUi;
    open: boolean;
    onSaveClose: (c: string) => void;
    game?: GameDescription;
}

const PopupCodeEditor: React.FC<PopupCodeEditorProps> = ({ code, ui, open, onSaveClose, game }) => {
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

        const rtData = rt()
        if (rtData) {
            return mergeDicts(args, rtData)
        } else {
            return args
        }
    }

    const renderEditor = () => {
        return <CodeEditor value={codeVal} language="js" placeholder="Please enter JS code or leave blank for no action." data-color-mode="dark" minHeight={12} onChange={(evn) => setCode(evn.target.value)}
        padding={10}
        style={{
            fontSize: 14,
            backgroundColor: "#050505",
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
                <mark>{docOpenFor}</mark><br/>
                <span>{docOpenFor in args ? args[docOpenFor] : "missing documentation"}</span>
            </p>
        }
    }

    const accessibleObjectClick = (name: string) => {
        setDocOpenFor(name);
    }

    const accessibleObjectAddClick = (name: string) => {
        console.log("add clicked: " + name);
        setCode(codeVal + name);
    }

    const renderExamples = () => {
        const applyCodeTemplate = (name: string) => {
            setCode(ui.functionTemplates[name])
        }
        return Object.entries(ui.functionTemplates).map(example => {
            const [name, code] = example
            return <button className="load-example-btn-code" onClick={() => applyCodeTemplate(name)} key={name}>{name}</button>
        })
    }

    const argumentsCommaSeparated = (argsObj: {[key: string]: string}) => {
        const keys = Object.keys(argsObj)
        const keysRootOnly = keys.filter(val => val.indexOf(".") < 0)
        return keysRootOnly.join(', ')
    }

    return open ? (
        <Modal size={'full'} open={open} onClose={() => onSaveClose(codeVal)} backdrop={true}>
            <Modal.Header>
                <Modal.Title>{ui.header}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="editor-content-code">
                    <div className='side-panel-code'>
                        <div className='object-navi-code'>
                            <h3 className='micro-header-code'>Available objects</h3>
                            <AccessibleObjects objectDescrMap={getArguments()} onObjectClick={accessibleObjectClick} onAddClick={accessibleObjectAddClick}/>
                        </div>
                        <div className='object-docs-code'>
                            {renderDoc()}
                        </div>
                    </div>
                    <div className='editor-panel-code'>
                        function {ui.functionName}({argumentsCommaSeparated(getArguments())}) {"{"}
                        {renderEditor()}
                        {"}"}
                        <br/>
                        <br/>
                        <span className="load-examples-code">{"// Load examples: "}{renderExamples()}</span>
                    </div>
                </div>


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
