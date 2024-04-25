import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import StaticTabs from '../../common/StaticTabs';
import CharMenu from './CharMenu';
import RolesMenu from './RolesMenu';

interface CharEditorTabsProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
    visible: boolean
}

const CharEditorTabs: React.FC<CharEditorTabsProps> = ({ game, onSetGame, handlers, visible }) => {
    if (!visible) {
        // TODO: change this hardcore optimization to something lighter
        return <div></div>
    }

    const createRolesEditorTab = () => {
        return {
            header: "Roles",
            content: <RolesMenu game={game} onSetGame={onSetGame} handlers={handlers}/>,
            disabled: false
        }
    }

    const createTraitsEditorTab = () => {
        return {
            header: "Traits",
            content: <div/>,
            disabled: true
        }
    }

    const createCharsEditorTab = () => {
        return {
            header: "Characters",
            content: <CharMenu game={game} onSetGame={onSetGame} handlers={handlers}/>
        }
    }

    return (
        <StaticTabs keepOpen={true} tabs={[createCharsEditorTab(), createRolesEditorTab(), createTraitsEditorTab()]}/>
    );
};

export default CharEditorTabs;
