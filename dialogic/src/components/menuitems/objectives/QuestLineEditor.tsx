import React, { useState, useEffect } from 'react';
import QuestLine from '../../../game/Objectives';
import { GameDescription } from '../../../game/GameDescription';
import { Input } from 'rsuite';
import './quest.css'

interface QuestLineEditorProps {
    questline: QuestLine;
    game: GameDescription;
    onSetQuestLine: (line: QuestLine) => void
}

const QuestLineEditor: React.FC<QuestLineEditorProps> = ({ questline, game, onSetQuestLine }) => {
    const [qline, setQline] = useState<QuestLine>(questline);
    useEffect(() => {
        setQline(questline);
    }, [questline]);

    return (
        <div onBlur={() => onSetQuestLine(qline)} className='objectives-editing-main-container'>
            <p>UID: <code>{qline.uid}</code></p>
            <Input placeholder='Quest line name' value={qline.name} onChange={value => setQline({...qline, name: value})}/>
        </div>
    );
};

export default QuestLineEditor;
