import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';

interface CharMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const CharMenu: React.FC<CharMenuProps> = ({ game, onSetGame, handlers: IUpds }) => {
    const [editingIndex, setEditingIndex] = useState<Number>(-1);
    useEffect(() => {
        setEditingIndex(editingIndex);
    }, [game]);

    return (
        <p>
          Editing index = {editingIndex.toString()}
        </p>
    );
};

export default CharMenu;
