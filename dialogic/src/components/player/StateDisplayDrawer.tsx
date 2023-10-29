import React, { useState, useEffect } from 'react';
import { State } from '../../exec/GameState';
import { Drawer, Input } from 'rsuite';
import { toYaml } from '../../Trace';

interface StateDisplayDrawerProps {
    state: State;
    onClose: () => void
    open: boolean
    onStateChange?: (state: State) => void
}

const StateDisplayDrawer: React.FC<StateDisplayDrawerProps> = ({ state, onClose, open }) => {
    // const [, set] = useState<GameState>(state);
    useEffect(() => {
        // set(state);
    }, [state]);

    return (
        <Drawer open={open} onClose={onClose}>
            <Drawer.Body className='state-display-body'>
                <p>State</p>
                {open && <Input name='stateasyaml' style={{height: '100%', fontFamily: 'monospace'}} as='textarea' readOnly value={toYaml(state)} />}
            </Drawer.Body>
        </Drawer>
    );
};

export default StateDisplayDrawer;
