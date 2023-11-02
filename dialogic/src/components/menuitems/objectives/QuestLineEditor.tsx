import React, { useState, useEffect } from 'react';
import QuestLine, { Quest } from '../../../game/Objectives';
import { GameDescription } from '../../../game/GameDescription';
import { Divider, Input, Panel } from 'rsuite';
import './quest.css'
import QuestGenerator from './QuestGenerator';

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

    const handleOnCreateQuest = (quest: Quest) => {
        onSetQuestLine({...qline, quests: [...qline.quests, quest]})
    }

    return (
        <div onBlur={() => onSetQuestLine(qline)} className='objectives-editing-main-container'>
            <p>Quest line <b>{qline.name}</b></p>
            <Divider></Divider>
            <p>UID: <code>{qline.uid}</code></p>
            <Input placeholder='Quest line name' value={qline.name} onChange={value => setQline({...qline, name: value})}/>
            <Panel bordered style={{minWidth: "30em"}} collapsible header='Quest generator'>
                <QuestGenerator game={game} questline={questline} onCreateQuest={handleOnCreateQuest}/>
            </Panel>
        </div>
    );
};

export default QuestLineEditor;
