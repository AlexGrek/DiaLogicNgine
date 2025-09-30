
import TaskIcon from '@rsuite/icons/Task';
import lodash from 'lodash';
import React, { useState } from 'react';
import { Nav } from 'rsuite';
import { IUpds } from '../../../App';
import { isValidJsIdentifier } from '../../../Utils';
import { GameDescription } from '../../../game/GameDescription';
import QuestLine, { createQuestLine } from '../../../game/Objectives';
import CreateWithUid, { CreationData } from '../../common/CreateWithUid';
import Note from '../../userguide/Note';
import QuestLineEditor from './QuestLineEditor';

interface QuestLineMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const QuestLineMenu: React.FC<QuestLineMenuProps> = ({ game, onSetGame, handlers: IUpds }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    const questlines = game.objectives

    const existingUids = () => questlines.map(qline => qline.uid)

    const navItems = () => {
        return questlines.map((item, i) => {
            return <Nav.Item key={i} eventKey={i.toString()} icon={<TaskIcon />}>{item.name}</Nav.Item>
        })
    }

    const updateQuestLines = (value: QuestLine[]) => {
        onSetGame({ ...game, objectives: value })
    }

    const deleteQuestLine = (q: QuestLine) => {
        const upd = questlines.filter((ch) => ch.uid !== q.uid)
        updateQuestLines(upd)
        setEditingIndex(0)
    }

    const onSelectTab = (selected: string) => {
        const editingIndex = Number.parseInt(selected)
        if (!lodash.isNaN(editingIndex) && editingIndex >= 0 && editingIndex < questlines.length) {
            setEditingIndex(editingIndex)
        }
    }

    const setQuestLine = (i: number, value: QuestLine) => {
        const copy = lodash.cloneDeep(questlines)
        copy[i] = value
        updateQuestLines(copy)
    }

    const tab = (i: number) => {
        const q = questlines[i]
        return <QuestLineEditor onDeleteQuestLine={deleteQuestLine} game={game} questline={q} onSetQuestLine={value => setQuestLine(i, value)} />
    }

    const handleCreate = (data: CreationData) => {
        if (!isValidJsIdentifier(data.uid) || existingUids().includes(data.uid)) {
            return
        }
        const name = data.uid
        const copy = lodash.cloneDeep(questlines)
        const line = createQuestLine(name)
        line.name = data.name
        copy.push(line)
        updateQuestLines(copy)
    }

    return (
        <div>
            <div className='quest-menu-top-panel'>
                <Note text='**Quest Lines** contain **Quests**, and **Quests** contain **Tasks** that can be completed or failed' />
            </div>
            <div className='char-menu-tab-host'>
                <div className='char-menu-tab-navi'>
                    <CreateWithUid objectName='QuestLine' onCreate={handleCreate} />
                    <Nav vertical appearance="tabs" activeKey={editingIndex.toString()} onSelect={onSelectTab}>
                        {navItems()}
                    </Nav>
                </div>
                <div className='char-menu-tab-editor'>
                    {editingIndex >= 0 && editingIndex < questlines.length ? tab(editingIndex) : null}
                </div>
            </div>
        </div>

    );
};

export default QuestLineMenu;
