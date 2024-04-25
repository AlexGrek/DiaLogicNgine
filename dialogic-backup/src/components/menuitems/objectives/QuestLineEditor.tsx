import lodash from 'lodash';
import React, { useEffect, useState } from 'react';
import { Input, InputPicker, Panel, Stack } from 'rsuite';
import { GameDescription } from '../../../game/GameDescription';
import QuestLine, { Quest } from '../../../game/Objectives';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import QuestEditor from './QuestEditor';
import QuestGenerator from './QuestGenerator';
import './quest.css';

interface QuestLineEditorProps {
    questline: QuestLine;
    game: GameDescription;
    onSetQuestLine: (line: QuestLine) => void
    onDeleteQuestLine: (line: QuestLine) => void
}

const QuestLineEditor: React.FC<QuestLineEditorProps> = ({ questline, game, onDeleteQuestLine, onSetQuestLine }) => {
    const [qline, setQline] = useState<QuestLine>(questline);
    const [editingItem, setEditingItem] = useState<number>(-1)

    useEffect(() => {
        setQline(questline);
        // setEditingItem(-1);
    }, [questline]);

    const handleOnCreateQuest = (quest: Quest) => {
        setEditingItem(qline.quests.length)
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
        <div className='objectives-editing-main-container'>
            <Stack style={{ width: '90%' }} className='objectives-editing-main-top-panel' justifyContent='space-between' wrap>
                <div>
                    <p><small>UID: <code>{qline.uid}</code></small></p>
                </div>
                <h2 className='center-header'>Quest line <b>{qline.name}</b></h2>
                <div>
                    <ConfirmDeleteButton objectDescr="quest line" onConfirm={() => onDeleteQuestLine(questline)} />
                </div>
            </Stack>
            <div onBlur={() => onSetQuestLine(qline)}>
            <p style={{ width: '100%' }} className='editor-label'>Name</p>
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
        </div>
    );
};

export default QuestLineEditor;
