import React, { useState, useEffect } from 'react';
import QuestLine, { Quest, Task } from '../../../game/Objectives';
import { GameDescription } from '../../../game/GameDescription';
import { Button, Divider, Input, InputPicker, Panel } from 'rsuite';
import './quest.css'
import QuestGenerator from './QuestGenerator';
import lodash from 'lodash';

interface QuestEditorProps {
    quest: Quest
    onSetQuest: (line: Quest) => void
    game: GameDescription
}

const QuestEditor: React.FC<QuestEditorProps> = ({ quest, game, onSetQuest }) => {
    const [q, setQ] = useState<Quest>(quest);

    useEffect(() => {
        setQ(quest);
    }, [quest]);

    const renderTasks = (tasks: Task[]) => {
        const results = tasks.map((t, index) => {
            return <Button key={index} appearance='subtle'>{t.text}<br/><code><small>{t.uid}</small></code></Button>
        })
        return results
    }

    return (
        <div onBlur={() => onSetQuest(q)} className='objectives-editing-main-container'>
            <div className='objectives-render-item'>
                UID: <code>{q.uid}</code>
                <br/>
                <p>Name</p>
                <Input value={q.name} onChange={(value) => setQ({ ...q, name: value })} />
                <br/>
                <li className='objectives-editing-tasks'>
                    {renderTasks(q.tasks)}
                </li>
            </div>
        </div>
    );
};

export default QuestEditor;
