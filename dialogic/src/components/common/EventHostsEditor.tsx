import React from 'react';
import { EventHost } from '../../game/Events';
import { CheckPicker } from 'rsuite';
import './EventHostEditor.css'

interface EventHostsEditorProps {
    eventHosts: EventHost[];
    value: string[]
    onValueChange: (hosts: string[]) => void
    personalEventHostName: string
}

const EventHostsEditor: React.FC<EventHostsEditorProps> = ({ eventHosts, onValueChange, value, personalEventHostName }) =>
{
    const data = eventHosts.map(ev => {
        return {label: ev, value: ev}
    })

    return (
        <div>
            <p className='event-hosts-editor-personal'>This event host: <code>{personalEventHostName}</code></p>
            <p>
                <CheckPicker placeholder="Add event hosts" data={data} value={value} onChange={(val) => onValueChange(val == null ? [] : val)}/>
                </p>
        </div>
    );
};

export default EventHostsEditor;
