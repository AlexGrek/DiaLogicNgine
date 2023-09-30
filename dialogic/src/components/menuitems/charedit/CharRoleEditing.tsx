import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import Character from '../../../game/Character';
import './charediting.css';
import { Panel, PanelGroup } from 'rsuite';
import TextListEditor from '../../common/text_list/TextListEditor';

interface CharRoleEditingProps {
    game: GameDescription;
    char: Character
    onCharacterChange: (char: Character) => void
}

const CharRoleEditing: React.FC<CharRoleEditingProps> = ({ game, char }) => {
    const [ch, setCh] = useState<Character>(char);
    useEffect(() => {
        setCh(char);
    }, [char]);

    return (
        <div className='char-editing-main-container'>
            <h3>{ch.uid}</h3>
            
        </div>
    );
};

export default CharRoleEditing;
