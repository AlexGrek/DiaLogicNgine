import React, { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Divider, Drawer, Input, Stack } from 'rsuite';
import { IUpds } from '../../../App';
import { generateUidFromName } from '../../../Utils';
import { GameDescription } from '../../../game/GameDescription';
import { Quest, Task, createTaskByUid } from '../../../game/Objectives';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';
import './quest.css';
import CodeSampleButton from '../../common/CodeSampleButton';
import Note from '../../userguide/Note';

const CODE_EDITOR_UI_ON: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    "functionName": "onTaskDone",
    "functionTemplates": {
        "no action": "",
        "log victory": "console.log('Task completed!')",
        "change property": "props.testNumProp = 1"
    },
    "header": "What to do after task"
}

const CODE_EDITOR_UI_AUTOCHECK: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    "functionName": "autoCheckScript",
    "functionTemplates": {
        "no action": "",
        "prop value check": "return props.testNumProp == 42",
        "fact check": "return facts.you_are_test_subject.known"
    },
    "header": "Run code ON EVERY SCREEN if this task is open"
}

type CodeEditMenu = "onComplete" | "onFail" | "autoCheckScript"

interface TaskEditorProps {
    value: Task | null
    quest: Quest
    onSetTask: (task: Task) => void
    game: GameDescription
    handlers?: IUpds
}

const TaskEditor: React.FC<TaskEditorProps> = ({ value, game, onSetTask, quest }) => {
    const [task, setTask] = useState<Task>(value || createTaskByUid("_", 0))
    const textFieldRef = useRef<HTMLInputElement>(null)

    // enable code editor props
    const [codeEditMenu, setCodeEditMenu] = useState<CodeEditMenu>("autoCheckScript");
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false);

    useEffect(() => {
        setTask(value || createTaskByUid("_", 0))
        
        setTimeout(() => {
            console.log("Try to focus")
            if (textFieldRef.current && value) {
                textFieldRef.current.focus()
                console.log("focus")
            }
        }, 100)
    }, [value])

    const handleSave = () => {
        onSetTask(task)
    }

    const handleGenUid = () => {
        const id = generateUidFromName(task.text)
        setTask({ ...task, uid: id })
    }

    const textFieldEditor = (field: keyof Task, name?: string, focus = false) => {
        const handleChange = (value: string) => setTask({ ...task, [field]: value })
        const nameText = name || field
        return <div className='text-field-editor'><p className='editor-label' ref={focus ? textFieldRef : undefined}>{name}</p><Input name={nameText} value={`${task[field]}`} onChange={handleChange} /></div>
    }

    // code editor

    const renderCodeEditor = (menu: CodeEditMenu) => {
        const code = task[menu]
        let ui = CODE_EDITOR_UI_ON
        if (menu === 'autoCheckScript') {
            ui = CODE_EDITOR_UI_AUTOCHECK
        }
        return <PopupCodeEditor game={game} ui={ui} code={code || ""} onSaveClose={(s) => editCode(menu, s)} open={codeEditorOpen}></PopupCodeEditor>
    }

    const editCode = (menu: CodeEditMenu, val: string) => {
        const upd = val.trim() === "" ? undefined : val;
        setTask({ ...task, [menu]: upd })
        setCodeEditorOpen(false)
    }

    const renderCodeEditButton = (prop: CodeEditMenu, name?: string) => {
        const displayName = name || prop
        const codeEdit = (menu: CodeEditMenu) => {
            setCodeEditMenu(menu)
            setCodeEditorOpen(true)
        }
        return <CodeSampleButton onClick={() => codeEdit(prop)} name={displayName} code={task[prop]} />
    }

    const renderBody = () => {
        return <Stack direction='column' alignItems='stretch'>
            {textFieldEditor('text', "Task text", true)}
            <Button onClick={handleGenUid} appearance='subtle'>Generate UID</Button>
            {textFieldEditor('uid', "Task JS UID")}
            <Checkbox checked={task.critical} onChange={(_, checked) => setTask({ ...task, critical: checked })}>is critical (failure will fail the quest)</Checkbox>
            {renderCodeEditor(codeEditMenu)}
            <Divider>Scripting</Divider>
            <Note text='This script will run always, **on each screen** when this task is open and not passed/failed' />
            {renderCodeEditButton("autoCheckScript")}
            <Note text='Scripts to run *after* task is marked as passed or failed' />
            {renderCodeEditButton("onComplete")}
            {renderCodeEditButton("onFail")}
        </Stack>
    }

    return (
        <Drawer placement='right' open={value != null} onClose={handleSave}>
            <Drawer.Header>
                <Drawer.Title>Edit task</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={handleSave}>Save</Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                {value != null && renderBody()}
            </Drawer.Body>
        </Drawer>
    );
};

export default TaskEditor;
