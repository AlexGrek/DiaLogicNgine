import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import { Button } from 'rsuite';
import StaticTabs from '../../common/StaticTabs';
import PropsEditMenu from './PropsEditMenu';

interface ScriptEditMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const ScriptEditMenu: React.FC<ScriptEditMenuProps> = ({ game, onSetGame, handlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [creatingNew, setCreatingNew] = useState<boolean>(false);
    useEffect(() => {
        setEditingIndex(editingIndex);
    }, [game]);

    const createPropsEditorTab = () => {
        return {
            header: "Props",
            content: <PropsEditMenu game={game} onSetGame={onSetGame} handlers={handlers}></PropsEditMenu>
        }
    }

    const createScriptsEditorTab = () => {
        return {
            header: "Scripting",
            content: <p>scripts tab!</p>
        }
    }

    return (
        <StaticTabs tabs={[createPropsEditorTab(), createScriptsEditorTab()]}></StaticTabs>
    );
};

export default ScriptEditMenu;
