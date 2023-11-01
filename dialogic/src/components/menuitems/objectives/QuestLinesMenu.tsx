import PeoplesMapIcon from '@rsuite/icons/PeoplesMap';
import PlusIcon from '@rsuite/icons/Plus';
import lodash from 'lodash';
import React, { useState } from 'react';
import { Dropdown, Input, InputGroup, Nav } from 'rsuite';
import { IUpds } from '../../../App';
import { isValidJsIdentifier } from '../../../Utils';
import { GameDescription } from '../../../game/GameDescription';
import QuestLine, { createQuestLine } from '../../../game/Objectives';
import Note from '../../userguide/Note';
import QuestLineEditor from './QuestLineEditor';
import TaskIcon from '@rsuite/icons/Task';

interface QuestLineMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const QuestLineMenu: React.FC<QuestLineMenuProps> = ({ game, onSetGame, handlers: IUpds }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [creatingUID, setCreatingUID] = useState<string>("");

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

    const deleteRole = (uid: string) => {
        const upd = game.objectives.filter((ch) => ch.uid !== uid)
        updateQuestLines(upd)
        setCreatingUID("")
        setEditingIndex(0)
    }

    const addQuestLine = () => {
        if (!isValidJsIdentifier(creatingUID) || existingUids().includes(creatingUID)) {
            return
        }
        const name = creatingUID
        setCreatingUID("")
        const copy = lodash.cloneDeep(questlines)
        copy.push(createQuestLine(name))
        updateQuestLines(copy)
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
        return <QuestLineEditor game={game} questline={q} onSetQuestLine={value => setQuestLine(i, value)} />
    }

    return (
        <div>
            <div className='char-menu-top-panel'>
                <Note text='Create a role for NPCs that contain properties and functions, that can be used by NPCs, and can be overriden by NPCs' />
            </div>
            <div className='char-menu-tab-host'>
                <div className='char-menu-tab-navi'>
                    <Dropdown title="Create">
                        <Dropdown.Item panel style={{ padding: 10, width: 280 }}>
                            <InputGroup>
                                <InputGroup.Addon>UID:</InputGroup.Addon><Input onPressEnter={() => addQuestLine()} value={creatingUID} onChange={setCreatingUID}></Input>
                                <InputGroup.Button onClick={() => addQuestLine()} disabled={!isValidJsIdentifier(creatingUID)}><PlusIcon /></InputGroup.Button>
                            </InputGroup>
                        </Dropdown.Item>
                    </Dropdown>
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
