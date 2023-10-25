import React, { useState, useEffect } from 'react';
import diff from 'deep-diff'
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import UserBadgeIcon from '@rsuite/icons/UserBadge';
import PlusIcon from '@rsuite/icons/Plus';
import { Button, Col, Dropdown, Input, InputGroup, Nav, Notification } from 'rsuite';
import lodash from 'lodash';
import Character, { createEmptyCharacter } from '../../../game/Character';
import { isValidJsIdentifier } from '../../../Utils';
import CharEditing from './CharEditing';
import './charmenu.css'
import PasteButton from '../../common/copypaste/PasteButton';

interface CharMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const CharMenu: React.FC<CharMenuProps> = ({ game, onSetGame, handlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [creatingUID, setCreatingUID] = useState<string>("");

    const navItems = () => {
        return game.chars.map((item, i) => {
            return <Nav.Item key={i} eventKey={i.toString()} icon={<UserBadgeIcon />}>{item.displayName.main || item.uid}</Nav.Item>
        })
    }

    const updateCharacterList = (chars: Character[]) => {
        const newGame = { ...game, chars: chars }
        onSetGame(newGame)
    }

    const createCharacter = () => {
        if (!isValidJsIdentifier(creatingUID)) {
            return
        }
        const name = creatingUID
        setCreatingUID("")
        const copy = lodash.cloneDeep(game.chars)
        copy.push(createEmptyCharacter(name))
        updateCharacterList(copy)
    }

    const charPasted = (obj: any, typename: string, newUid?: string) => {
        if (newUid === undefined || typename !== 'char') {
            return
        }
        const name = newUid
        const character = obj as Character
        const copy = lodash.cloneDeep(game.chars)
        console.log(`Pasted character: ${JSON.stringify(character)}`)
        copy.push({...character, uid: name})
        updateCharacterList(copy)
    }

    const deleteCharacter = (uid: string) => {
        const chars = game.chars
        const updatedCharList = chars.filter((ch) => ch.uid !== uid)
        updateCharacterList(updatedCharList)
        setCreatingUID("")
        setEditingIndex(0)
    }

    const onSelectTab = (selected: string) => {
        const editingIndex = Number.parseInt(selected)
        if (!lodash.isNaN(editingIndex) && editingIndex >= 0 && editingIndex < game.chars.length) {
            setEditingIndex(editingIndex)
        }
    }

    const setCharacter = (i: number, value: Character) => {
        const copy = lodash.cloneDeep(game.chars)
        const difference = diff(copy[i], value)
        console.log(`upd char from ${JSON.stringify(copy[i])} to ${JSON.stringify(value)}, diff: ${JSON.stringify(difference)}`)
        copy[i] = value
        updateCharacterList(copy)
    }

    const tab = (i: number) => {
        const char = game.chars[i]
        return <CharEditing onDelete={deleteCharacter} key={char.uid} game={game} char={char} onCharacterChange={value => setCharacter(i, value)} handlers={handlers}></CharEditing>
    }

    return (
        <div>
            <div className='char-menu-top-panel'>
            </div>
            <div className='char-menu-tab-host'>
                <div className='char-menu-tab-navi'>
                    <Dropdown title="Create">
                        <Dropdown.Item panel style={{ padding: 10, width: 280 }}>
                            <InputGroup>
                                <InputGroup.Addon>UID:</InputGroup.Addon><Input onPressEnter={() => createCharacter()} value={creatingUID} onChange={setCreatingUID}></Input>
                                <InputGroup.Button onClick={() => createCharacter()} disabled={!isValidJsIdentifier(creatingUID)}><PlusIcon /></InputGroup.Button>
                            </InputGroup>
                        </Dropdown.Item>
                    </Dropdown>
                    <PasteButton requireNewUid handlers={handlers} typenames={['char']} onPasteClick={charPasted}/>
                    <Nav vertical appearance="tabs" activeKey={editingIndex.toString()} onSelect={onSelectTab}>
                        {navItems()}
                    </Nav>
                </div>
                <div className='char-menu-tab-editor'>
                    {editingIndex >= 0 && editingIndex < game.chars.length ? tab(editingIndex) : null}
                </div>
            </div>
        </div>

    );
};

export default CharMenu;
