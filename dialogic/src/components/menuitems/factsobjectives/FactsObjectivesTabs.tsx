import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import StaticTabs from '../../common/StaticTabs';
import FactsMenu from './FactsMenu';

interface CharEditorTabsProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
    visible: boolean
}

const CharEditorTabs: React.FC<CharEditorTabsProps> = ({ game, onSetGame, handlers, visible }) => {
    const createFactsTab = () => {
        return {
            header: "Facts",
            content: <FactsMenu visible={visible} game={game} onSetGame={onSetGame} handlers={handlers}/>,
            disabled: false
        }
    }

    const createObjectivesTab = () => {
        return {
            header: "Objectives",
            content: <div/>,
            disabled: true
        }
    }

    const createLoreTab = () => {
        return {
            header: "Lore",
            content: <div/>,
            disabled: true
        }
    }

    return (
        <StaticTabs keepOpen={true} tabs={[createFactsTab(), createObjectivesTab(), createLoreTab()]}/>
    );
};

export default CharEditorTabs;
