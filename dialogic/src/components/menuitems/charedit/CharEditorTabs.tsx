import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import { Button } from 'rsuite';
import StaticTabs from '../../common/StaticTabs';
import Prop from '../../../game/Prop';
import lodash from 'lodash';
import CharMenu from './CharMenu';

interface CharEditorTabsProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const CharEditorTabs: React.FC<CharEditorTabsProps> = ({ game, onSetGame, handlers }) => {
    const createRolesEditorTab = () => {
        return {
            header: "Roles",
            content: <div/>,
            disabled: true
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
        <StaticTabs tabs={[createCharsEditorTab(), createRolesEditorTab(), createTraitsEditorTab()]}/>
    );
};

export default CharEditorTabs;
