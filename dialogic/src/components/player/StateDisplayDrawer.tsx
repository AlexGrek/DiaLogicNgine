import React from 'react';
import { State } from '../../exec/GameState';
import { Button, Drawer } from 'rsuite';
import StateYamlEditor from './StateYamlEditor';

interface StateDisplayDrawerProps {
    state: State;
    onClose: () => void
    open: boolean
    onStateChange?: (state: State) => void
}

const StateDisplayDrawer: React.FC<StateDisplayDrawerProps> = ({ state, onClose, open, onStateChange }) => {
    const handleStateChange = (next: State) => {
        onStateChange?.(next);
    };

    return (
        <Drawer open={open} onClose={onClose}>
            <Drawer.Header>
                <Drawer.Title>State</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={onClose}>Close</Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body className='state-display-body'>
                {onStateChange && (
                    <StateYamlEditor state={state} active={open} onStateChange={handleStateChange} />
                )}
            </Drawer.Body>
        </Drawer>
    );
};

export default StateDisplayDrawer;
