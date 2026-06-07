import React from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import PillLikeTabs from '../../common/PillLikeTabs';
import PropsEditMenu from './PropsEditMenu';
import Prop from '../../../game/Prop';
import EventsEditorTab from '../eventedit/EventsEditorTab';
import HooksEditorTab from './HooksEditorTab';

interface ScriptEditMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const ScriptEditMenu: React.FC<ScriptEditMenuProps> = ({ game, onSetGame, handlers }) => {
    const onSetGameProps = (props: Prop[]) => {
        const gameUpd = { ...game, props: props}
        onSetGame(gameUpd)
    }

    const createPropsEditorTab = () => {
        return {
            header: "Props",
            content: <PropsEditMenu game={game} props={game.props} onSetProps={onSetGameProps} handlers={handlers}></PropsEditMenu>
        }
    }

    const createScriptsEditorTab = () => {
        return {
            header: "Scripting",
            content: <p>scripts tab!</p>
        }
    }

    const createHooksEditorTab = () => {
        return {
            header: "Hooks",
            content: <HooksEditorTab game={game} onSetGame={onSetGame} />
        }
    }

    const createEventEditorTab = () => {
        return {
            header: "Events",
            content: <EventsEditorTab game={game} handlers={handlers} onSetGame={onSetGame}/>
        }
    }

    return (
        <PillLikeTabs tabs={[createPropsEditorTab(), createScriptsEditorTab(), createEventEditorTab(), createHooksEditorTab()]} />
    );
};

export default ScriptEditMenu;
