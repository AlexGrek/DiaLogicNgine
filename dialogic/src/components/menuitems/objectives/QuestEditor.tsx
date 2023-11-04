import React, { useState, useEffect, useRef } from 'react';
import QuestLine, { Quest, Task, createQuest, createTask } from '../../../game/Objectives';
import { GameDescription } from '../../../game/GameDescription';
import { Button, ButtonGroup, Divider, Drawer, IconButton, Input, InputPicker, Panel, Stack } from 'rsuite';
import './quest.css'
import QuestGenerator from './QuestGenerator';
import lodash from 'lodash';
import PlusRoundIcon from '@rsuite/icons/PlusRound';
import TrashIcon from '@rsuite/icons/Trash';
import ArrowDownLineIcon from '@rsuite/icons/ArrowDownLine';
import ArrowUpLineIcon from '@rsuite/icons/ArrowUpLine';
import OthersIcon from '@rsuite/icons/Others';
import MoreIcon from '@rsuite/icons/More';
import TaskEditor from './TaskEditor';
import { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';

interface QuestEditorProps {
    quest: Quest
    onSetQuest: (line: Quest) => void
    game: GameDescription
}

const QuestEditor: React.FC<QuestEditorProps> = ({ quest, game, onSetQuest }) => {
    const [q, setQ] = useState<Quest>(createQuest(''));
    const [editingItem, setEditingItem] = useState<number>(-1)
    const textFieldRef = useRef<HTMLInputElement>(null)
    const [itemMovingDownIndex, setItemMovingDownIndex] = useState<number>(-1)
    const [itemMovingUpIndex, setItemMovingUpIndex] = useState<number>(-1)

    useEffect(() => {
        setQ(quest);
        if (textFieldRef.current && quest.uid != q.uid) {
            textFieldRef.current.focus()
        }
        // setEditingItem(-1)
    }, [quest]);

    const handleTaskEdit = (t: Task) => {
        const tasks = [...q.tasks]
        if (editingItem >= 0 && editingItem < tasks.length) {
            tasks[editingItem] = t
            onSetQuest({ ...q, tasks: tasks })
        }
        setEditingItem(-1)
        setItemMovingUpIndex(-1)
        setItemMovingDownIndex(-1)
    }

    const handleMoveUp = (i: number) => {
        const swapIndex = i - 1
        if (swapIndex < 0 || i < 0) {
            return
        }
        swap(i, swapIndex)
        setItemMovingUpIndex(i)
        setItemMovingDownIndex(swapIndex)
    }

    const handleMoveDown = (i: number) => {
        const swapIndex = i + 1
        if (swapIndex >= q.tasks.length || i < 0) {
            return
        }
        swap(i, swapIndex)
        setItemMovingUpIndex(swapIndex)
        setItemMovingDownIndex(i)
    }

    const swap = (i: number, j: number) => {
        const tasks = [...q.tasks]
        tasks[i] = q.tasks[j]
        tasks[j] = q.tasks[i]
        onSetQuest({ ...q, tasks: tasks })
    }

    const handleCreateTask = () => {
        const tasks = [...q.tasks, createTask(q.uid, q.tasks.length - 1)]
        setEditingItem(tasks.length - 1)
        onSetQuest({ ...q, tasks: tasks })
    }

    const handleDeleteTask = (i: number) => {
        const tasks = [...q.tasks]
        tasks.splice(i, 1)
        setEditingItem(-1)
        onSetQuest({ ...q, tasks: tasks })
        setItemMovingUpIndex(-1)
        setItemMovingDownIndex(-1)
    }

    const getItemClass = (i: number) => {
        let className='objectives-editing-task'
        if (i === itemMovingDownIndex) {
            return "objectives-moving-down " + className
        }
        if (i === itemMovingUpIndex) {
            return "objectives-moving-up " + className
        }
        return className
    }

    const renderTasks = (tasks: Task[]) => {
        const results = tasks.map((t, index) => {
            return <Stack key={t.uid + index} alignItems='center' justifyContent='space-between' className={getItemClass(index)}>
                <div>
                    <Button onClick={() => setEditingItem(index)} className='objectives-editing-edit-task-link' appearance='link'>{t.text}</Button><br /><code><small>{t.uid}</small></code>
                </div>
                <ButtonGroup className='objectives-editing-task-controls'>
                    <Button appearance='subtle' onClick={() => setEditingItem(index)}><MoreIcon /></Button>
                    <Button appearance='subtle' onClick={() => handleMoveDown(index)} disabled={index == tasks.length - 1}><ArrowDownLineIcon /></Button>
                    <Button appearance='subtle' onClick={() => handleMoveUp(index)} disabled={index == 0}><ArrowUpLineIcon /></Button>
                    <Button appearance='subtle' onClick={() => handleDeleteTask(index)}><TrashIcon /></Button>
                </ButtonGroup>
            </Stack>
        })
        return results
    }

    return (
        <div onBlur={() => onSetQuest(q)} className='objectives-editing-main-container'>
            <div className='objectives-render-item'>
                UID: <code>{q.uid}</code>
                <br />
                <p className='editor-label'>Name</p>
                <Input ref={textFieldRef} value={q.name} onChange={(value) => setQ({ ...q, name: value })} />
                <br />
                <div className='objectives-editing-tasks'>
                    {renderTasks(q.tasks)}
                    <Stack justifyContent='center' onClick={handleCreateTask}><IconButton icon={<PlusRoundIcon />}>Add task</IconButton></Stack>
                </div>
            </div>
            <TaskEditor value={editingItem >= 0 && editingItem < q.tasks.length ? q.tasks[editingItem] : null} quest={q} onSetTask={handleTaskEdit} game={game} />
        </div>
    );
};

export default QuestEditor;
