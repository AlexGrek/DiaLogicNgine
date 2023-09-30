import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import Character from '../../../game/Character';
import './charediting.css';
import CharRoleEditing from './CharRoleEditing';
import PropsEditMenu from '../scriptedit/PropsEditMenu';
import Prop from '../../../game/Prop';
import { Panel, PanelGroup } from 'rsuite';
import TextListEditor from '../../common/text_list/TextListEditor';

interface CharEditingProps {
    game: GameDescription;
    char: Character
    onCharacterChange: (char: Character) => void
}

const CharEditing: React.FC<CharEditingProps> = ({ game, char, onCharacterChange }) => {
    const [ch, setCh] = useState<Character>(char);
    useEffect(() => {
        setCh(char);
    }, [char]);

    const save = () => {
        onCharacterChange(ch)
    }

    return (
        <div className='char-editing-main-container' onBlur={save}>
            <h3>{ch.uid}</h3>
            <PanelGroup accordion bordered className='char-editing-main-menu'>
                <Panel header="Display name" defaultExpanded>
                    <TextListEditor singleLine={true} textList={ch.displayName} onChange={p => setCh({ ...ch, displayName: p })}/>
                </Panel>
                <Panel header="Roles">
                <CharRoleEditing game={game} char={ch} onCharacterChange={setCh} />
                </Panel>
                <Panel header="Personal props">
                    <PropsEditMenu props={ch.props} onSetProps={p => setCh({ ...ch, props: p })} />
                </Panel>
                <Panel header="Display description" defaultExpanded>
                    <TextListEditor singleLine={false} textList={ch.displayName} onChange={p => setCh({ ...ch, displayName: p })}/>
                </Panel>
            </PanelGroup>
            
            
            
        </div>
    );
};

export default CharEditing;
