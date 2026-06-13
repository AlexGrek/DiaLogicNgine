import React from 'react';
import { State } from '../../exec/GameState';
import { GameDescription } from '../../game/GameDescription';
import { Button, Drawer } from 'rsuite';
import StateEditor from './StateEditor';

interface StateDisplayDrawerProps {
    state: State;
    game: GameDescription;
    onClose: () => void
    open: boolean
    onStateChange?: (state: State) => void
}

const StateDisplayDrawer: React.FC<StateDisplayDrawerProps> = ({ state, game, onClose, open, onStateChange }) => {
    const handleStateChange = (next: State) => {
        onStateChange?.(next);
    };

    return (
        <Drawer open={open} onClose={onClose} size='md'>
            <Drawer.Header>
                <Drawer.Title>State editor</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={onClose}>Close</Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body className='state-display-body'>
                {onStateChange && (
                    <StateEditor state={state} game={game} onStateChange={handleStateChange} />
                )}
            </Drawer.Body>
        </Drawer>
    );
};

export default StateDisplayDrawer;
