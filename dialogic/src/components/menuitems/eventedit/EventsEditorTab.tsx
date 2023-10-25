import PlusIcon from '@rsuite/icons/Plus';
import lodash from 'lodash';
import React, { useState } from 'react';
import { Button, CheckPicker, Checkbox, Col, Divider, Drawer, Dropdown, Grid, IconButton, Input, InputGroup, Row } from 'rsuite';
import { generateImageUrl, isValidJsIdentifier } from '../../../Utils';
import { GameDescription } from '../../../game/GameDescription';
import { Item, createEmptyItem } from '../../../game/Items';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import ImagePicker from '../../common/ImagePicker';
import StringListEditor from '../../common/StringListEditor';
import StringMapEditor from '../../common/StringMapEditor';
import './eventeditor.css';
import { IUpds } from '../../../App';
import { getLocEventHostName } from '../../../game/Loc';
import { getCharEventHostName } from '../../../game/Character';
import EventShort from './EventShort';
import PlusRoundIcon from '@rsuite/icons/PlusRound';
import EventEditorDrawer from './EventEditorDrawer';
import GameEvent, { createEvent } from '../../../game/Events';

interface EventsEditorTabProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void
    handlers: IUpds
}

const EventsEditorTab: React.FC<EventsEditorTabProps> = ({ game, onSetGame, handlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [editingObject, setEditingObject] = useState<GameEvent | null>(null)
    const [filterByTargets, setFilterByTargets] = useState<string[]>([])

    const predefinedHosts = [
        ...game.locs.map(loc => getLocEventHostName(loc)).filter(el => el !== null),
        ...game.chars.map(c => getCharEventHostName(c)).filter(el => el !== null)
    ]

    const allEventHosts = [...game.eventHosts, ...predefinedHosts]

    const preparedHostsData = allEventHosts.map((host) => {
        return { label: host || "null", value: host || "null" }
    })

    const setEdit = (i: number) => {
        setEditingIndex(i)
        setEditingObject(game.events[i])
    }

    const renderEvents = () => {
        const filtered = filterByTargets.length === 0 ? game.events : 
            game.events.filter(ev => {
                const intersections = ev.targets.filter(value => filterByTargets.includes(value));
                return (intersections.length > 0)
            })
        const eventShorts = filtered.map((evt, i) => {
            return <EventShort onEdit={() => setEdit(i)} event={evt} key={i}/>
        })
        return <div>
            <div className='events-list-control-panel'>
                <IconButton onClick={() => newEvent()} icon={<PlusRoundIcon/>}>Create event</IconButton>
                <CheckPicker value={filterByTargets} onChange={(upd) => setFilterByTargets(upd)} label="Target hosts" data={preparedHostsData}/>
                </div>
            {eventShorts}
        </div>
    }

    const renderCustomEventHosts = () => {
        return <div className='events-widget'>
            <p className='events-widget-header'>Custom event hosts</p>
            <StringListEditor canBeEmpty onChange={(value) => onSetGame({...game, eventHosts: value})} value={game.eventHosts}/>
        </div>
    }

    const renderPredefinedEventHosts = () => {
        const predefinedRender = predefinedHosts.map((text, i) => {
            return <p className='events-predefined-eventhost' key={i}>{text}</p>
        })
        return <div className='events-widget'>
            <p className='events-widget-header'>Predefined event hosts</p>
            {predefinedRender}
        </div>
    }

    const closeEventsEditor = () => {
        setEditingIndex(-1)
        setEditingObject(null)
    }

    const deleteEvent = (i: number) => {
        if (i < 0 || i >= game.events.length)
            return
        const eventsCopy = [...game.events]
        eventsCopy.splice(i, 1)
        setEditingIndex(-1)
        setEditingObject(null)
        onSetGame({...game, events: eventsCopy})
    }

    const newEvent = () => {
        const eventsCopy = [...game.events]
        eventsCopy.push(createEvent())
        setEditingIndex(eventsCopy.length - 1)
        setEditingObject(eventsCopy[eventsCopy.length - 1])
        onSetGame({...game, events: eventsCopy})
    }

    const editEvent = (e: GameEvent) => {
        const eventsCopy = [...game.events]
        eventsCopy[editingIndex] = e
        onSetGame({...game, events: eventsCopy})
    }

    const eventsEditor = <EventEditorDrawer event={editingObject} onEventChange={editEvent} onClose={closeEventsEditor} onDelete={() => deleteEvent(editingIndex)} hosts={allEventHosts} game={game}/>

    return (<Grid className="events-editor-grid">
        <Row className="event-show-grid">
            <Col xs={16}>
                <div className='events-grid-header'>
                    Events
                </div>
                {renderEvents()}
                {eventsEditor}
            </Col>
            <Col xs={6}>
                <div className='events-grid-header'>
                    Event hosts
                </div>
                {renderCustomEventHosts()}
                {renderPredefinedEventHosts()}
            </Col>
        </Row>
    </Grid>
    )
};

export default EventsEditorTab;
