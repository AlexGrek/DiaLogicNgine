import UserBadgeIcon from '@rsuite/icons/UserBadge';
import diff from 'deep-diff';
import lodash from 'lodash';
import React, { useState } from 'react';
import { Nav } from 'rsuite';
import { IUpds } from '../../../App';
import Character, { createEmptyCharacter } from '../../../game/Character';
import { GameDescription } from '../../../game/GameDescription';
import CreateWithUid, { CreationData } from '../../common/CreateWithUid';
import PasteButton from '../../common/copypaste/PasteButton';
import Note from '../../userguide/Note';
import CharEditing from './CharEditing';
import './charmenu.css';

interface CharMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const CharMenu: React.FC<CharMenuProps> = ({ game, onSetGame, handlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    const navItems = () => {
        return game.chars.map((item, i) => {
            return <Nav.Item data-char={item.uid} key={i} eventKey={i.toString()} icon={<UserBadgeIcon />}>{item.displayName.main || item.uid}</Nav.Item>
        })
    }

    const updateCharacterList = (chars: Character[]) => {
        const newGame = { ...game, chars: chars }
        onSetGame(newGame)
    }

    const createCharacter = (data: CreationData) => {
        const char = createEmptyCharacter(data.uid)
        char.displayName.main = data.name
        const copy = lodash.cloneDeep(game.chars)
        copy.push(char)
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
        copy.push({ ...character, uid: name })
        updateCharacterList(copy)
    }

    const deleteCharacter = (uid: string) => {
        const chars = game.chars
        const updatedCharList = chars.filter((ch) => ch.uid !== uid)
        updateCharacterList(updatedCharList)
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
        // console.log(`upd char from ${JSON.stringify(copy[i])} to ${JSON.stringify(value)}, diff: ${JSON.stringify(difference)}`)
        copy[i] = value
        updateCharacterList(copy)
    }

    const tab = (i: number) => {
        const char = game.chars[i]
        return <CharEditing onDelete={deleteCharacter} key={char.uid} game={game} char={char} onCharacterChange={value => setCharacter(i, value)} handlers={handlers}></CharEditing>
    }

    return (
        <div id='charmenu'>
            <div className='char-menu-top-panel'>
                <Note text='Create **characters** (NPCs) and customize their behavior and properties' />
            </div>
            <div className='char-menu-tab-host'>
                <div className='char-menu-tab-navi'>
                    <CreateWithUid objectName={'character'} onCreate={createCharacter} />
                    <PasteButton requireNewUid handlers={handlers} typenames={['char']} onPasteClick={charPasted} />
                    <Nav id='chars' vertical appearance="tabs" activeKey={editingIndex.toString()} onSelect={onSelectTab}>
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
