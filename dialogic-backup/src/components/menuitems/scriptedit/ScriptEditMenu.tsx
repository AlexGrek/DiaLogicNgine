import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import { Button } from 'rsuite';
import StaticTabs from '../../common/StaticTabs';
import PropsEditMenu from './PropsEditMenu';
import Prop from '../../../game/Prop';
import lodash from 'lodash';
import EventsEditorTab from '../eventedit/EventsEditorTab';

interface ScriptEditMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
    visible: boolean
}

const ScriptEditMenu: React.FC<ScriptEditMenuProps> = ({ game, onSetGame, handlers, visible }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    useEffect(() => {
        setEditingIndex(editingIndex);
    }, [game]);

    const onSetGameProps = (props: Prop[]) => {
        const gameUpd = { ...game, props: props}
        onSetGame(gameUpd)
    }

    const createPropsEditorTab = () => {
        return {
            header: "Props",
            content: <PropsEditMenu visible={visible} game={game} props={game.props} onSetProps={onSetGameProps} handlers={handlers}></PropsEditMenu>
        }
    }

    const createScriptsEditorTab = () => {
        return {
            header: "Scripting",
            content: <p>scripts tab!</p>
        }
    }

    const createEventEditorTab = () => {
        return {
            header: "Events",
            content: <EventsEditorTab visible={visible} game={game} handlers={handlers} onSetGame={onSetGame}/>
        }
    }

    return (
        <StaticTabs tabs={[createPropsEditorTab(), createScriptsEditorTab(), createEventEditorTab()]}></StaticTabs>
    );
};

export default ScriptEditMenu;
