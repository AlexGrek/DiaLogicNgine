import React, { useState, useEffect } from 'react';
import QuestLine, { Quest } from '../../../game/Objectives';
import { GameDescription } from '../../../game/GameDescription';
import { Divider, Input, InputPicker, Panel } from 'rsuite';
import './quest.css'
import QuestGenerator from './QuestGenerator';
import lodash from 'lodash';

interface QuestLineEditorProps {
    questline: QuestLine;
    game: GameDescription;
    onSetQuestLine: (line: QuestLine) => void
}

const QuestLineEditor: React.FC<QuestLineEditorProps> = ({ questline, game, onSetQuestLine }) => {
    const [qline, setQline] = useState<QuestLine>(questline);
    const [editingItem, setEditingItem] = useState<number>(-1)

    useEffect(() => {
        setQline(questline);
        setEditingItem(-1);
    }, [questline]);

    const handleOnCreateQuest = (quest: Quest) => {
        onSetQuestLine({...qline, quests: [...qline.quests, quest]})
    }

    const pickerData = questline.quests.map((quest, number) => {
        return { label: quest.name, value: number }
    })

    const handleChangeQuest = (q: Quest, i: number) => {
        const questsCopy = lodash.cloneDeep(qline.quests)
        questsCopy[i] = q
        return setQline({...qline, quests: questsCopy})
    }

    const renderItem = (q: Quest) => {
        return <div className='objectives-render-item'>
            {q.uid}
            <Input value={q.name} onChange={(value) => handleChangeQuest({...q, name: value}, editingItem)} />
        </div>
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
            <InputPicker data={pickerData} block value={editingItem} onChange={setEditingItem} />
            {editingItem >= 0 && editingItem <  questline.quests.length && <Panel>
                {renderItem(questline.quests[editingItem])}
            </Panel>}
        </div>
    );
};

export default QuestLineEditor;
