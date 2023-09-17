import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import Character from '../../../game/Character';
import './charediting.css';

interface CharEditingProps {
    game: GameDescription;
    char: Character
    onCharacterChange: (char: Character) => void
}

const CharEditing: React.FC<CharEditingProps> = ({ game, char }) => {
    const [ch, setCh] = useState<Character>(char);
    useEffect(() => {
        setCh(char);
    }, [char]);

    return (
        <div className='char-editing-main-container'>
            <h2>{ch.uid}</h2>
        </div>
    );
};

export default CharEditing;
