import React, { useState, useEffect } from 'react';
import QuestLine, { Quest } from '../../../game/Objectives';
import { GameDescription } from '../../../game/GameDescription';
import { Divider, Input, InputPicker, Panel, Stack } from 'rsuite';
import './quest.css'
import QuestGenerator from './QuestGenerator';
import lodash from 'lodash';
import QuestEditor from './QuestEditor';

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
        // setEditingItem(-1);
    }, [questline]);

    const handleOnCreateQuest = (quest: Quest) => {
        onSetQuestLine({ ...qline, quests: [...qline.quests, quest] })
    }

    const pickerData = questline.quests.map((quest, number) => {
        return { label: quest.name, value: number }
    })

    const handleChangeQuest = (q: Quest, i: number) => {
        const questsCopy = lodash.cloneDeep(qline.quests)
        questsCopy[i] = q
        return onSetQuestLine({ ...qline, quests: questsCopy })
    }

    const renderItem = (q: Quest) => {
        return <QuestEditor quest={q} onSetQuest={value => handleChangeQuest(value, editingItem)} game={game} />
    }

    return (
        <div onBlur={() => onSetQuestLine(qline)} className='objectives-editing-main-container'>
            <p>Quest line <b>{qline.name}</b></p>
            <Divider></Divider>
            <p>UID: <code>{qline.uid}</code></p>
            <Input placeholder='Quest line name' value={qline.name} onChange={value => setQline({ ...qline, name: value })} />
            <Stack direction='row-reverse' alignItems='flex-start' wrap>
                <Panel bordered collapsible header='Quest generator' style={{ height: '100%', overflowY: 'auto', minWidth: "30em" }}>
                    <QuestGenerator game={game} questline={qline} onCreateQuest={handleOnCreateQuest} />
                </Panel>
                <Panel bordered collapsible header='Quest editor' defaultExpanded style={{ height: '100%', overflowY: 'auto', minWidth: "46em" }}>
                    <InputPicker data={pickerData} block value={editingItem} onChange={setEditingItem} />
                    {editingItem >= 0 && editingItem < qline.quests.length &&
                        renderItem(qline.quests[editingItem])}
                </Panel>
            </Stack>
        </div>
    );
};

export default QuestLineEditor;
