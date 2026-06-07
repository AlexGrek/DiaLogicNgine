import React from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import PillLikeTabs from '../../common/PillLikeTabs';
import FactsMenu from './FactsMenu';
import QuestLineMenu from '../objectives/QuestLinesMenu';
import './facts.css'

interface FactsObjectivesTabsProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const CharEditorTabs: React.FC<FactsObjectivesTabsProps> = ({ game, onSetGame, handlers }) => {
    const createFactsTab = () => {
        return {
            header: "Facts",
            content: <FactsMenu game={game} onSetGame={onSetGame} handlers={handlers} />,
            disabled: false
        }
    }

    const createObjectivesTab = () => {
        return {
            header: "Objectives",
            content: <QuestLineMenu game={game} onSetGame={onSetGame} handlers={handlers} />,
            disabled: false
        }
    }

    const createLoreTab = () => {
        return {
            header: "Lore",
            content: <div />,
            disabled: true
        }
    }

    return (
        <PillLikeTabs tabs={[createFactsTab(), createObjectivesTab(), createLoreTab()]} />
    );
};

export default CharEditorTabs;
