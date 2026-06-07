import lodash from 'lodash';
import React, { useEffect, useState } from 'react';
import { Button, Input, Message } from 'rsuite';
import { State } from '../../exec/GameState';
import { objectFromYaml, toYaml } from '../../Trace';

const STATE_REQUIRED_FIELDS = [
    'position',
    'stepCount',
    'positionStack',
    'positionHistory',
    'location',
    'charDialog',
    'props',
    'shortHistory',
    'gameVersion',
    'knownFacts',
    'knownPeople',
    'knownPlaces',
    'progress',
    'quickReplyText',
    'engineVersion',
    'notifications',
    'carriedItems',
    'happenedEvents',
    'dialogPage',
];

interface StateYamlEditorProps {
    state: State;
    active: boolean;
    onStateChange: (state: State) => void;
}

const StateYamlEditor: React.FC<StateYamlEditorProps> = ({ state, active, onStateChange }) => {
    const [yamlText, setYamlText] = useState<string>('');
    const [errorText, setErrorText] = useState<string>('');

    useEffect(() => {
        if (active) {
            setYamlText(toYaml(state));
            setErrorText('');
        }
    }, [active, state]);

    const handleApply = () => {
        try {
            const parsed = objectFromYaml(yamlText, STATE_REQUIRED_FIELDS) as State;
            setErrorText('');
            onStateChange(lodash.cloneDeep(parsed));
        } catch (e) {
            setErrorText(`${e}`);
        }
    };

    if (!active) {
        return null;
    }

    return (
        <div className='state-yaml-editor'>
            {errorText ? <Message type="error" showIcon style={{ marginBottom: 8 }}>{errorText}</Message> : null}
            <Input
                name='stateasyaml'
                as='textarea'
                rows={16}
                value={yamlText}
                onChange={setYamlText}
                style={{ fontFamily: 'monospace', width: '100%' }}
            />
            <Button name='edit' appearance='primary' onClick={handleApply} style={{ marginTop: 8 }}>
                Edit
            </Button>
        </div>
    );
};

export default StateYamlEditor;
