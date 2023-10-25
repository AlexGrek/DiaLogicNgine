import React from 'react';
import GameEvent from '../../../game/Events';
import './eventeditor.css'
import ArrowRightIcon from '@rsuite/icons/ArrowRight';
import { Tag } from 'rsuite';

interface EventShortProps {
    event: GameEvent;
    onEdit: () => void
}

const EventShort: React.FC<EventShortProps> = ({ event, onEdit }) => {
    const targets = event.targets.map((t, i) => {
        return <Tag key={i}>{t}</Tag>
    })

    return (
        <div className="event-short-container" onClick={() => onEdit()}>
            <div className="event-short-header">
                <p className="event-short-name">
                    {event.highPriority && <span className='event-highptiority-mark'>!</span>}
                    <span className='event-probability-tag'>
                        {event.probability}%
                    </span>
                    {event.name}
                </p>
                <p className="event-short-target-dialog"><ArrowRightIcon/>{event.link ? `${event.link.dialog}.${event.link.window}` : "[no link]"}</p>
            </div>
            <p className='event-short-targets'>{targets}</p>
        </div>
    );
};

export default EventShort;
