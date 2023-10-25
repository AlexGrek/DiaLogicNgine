import PlusIcon from '@rsuite/icons/Plus';
import lodash from 'lodash';
import React, { useState } from 'react';
import { Button, Checkbox, Col, Divider, Drawer, Dropdown, Grid, Input, InputGroup, Row } from 'rsuite';
import { generateImageUrl, isValidJsIdentifier } from '../../../Utils';
import { GameDescription } from '../../../game/GameDescription';
import { Item, createEmptyItem } from '../../../game/Items';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import ImagePicker from '../../common/ImagePicker';
import StringListEditor from '../../common/StringListEditor';
import StringMapEditor from '../../common/StringMapEditor';
import './eventeditor.css';
import { IUpds } from '../../../App';

interface EventsEditorTabProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void
    handlers: IUpds
}

const EventsEditorTab: React.FC<EventsEditorTabProps> = ({ game, onSetGame, handlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [editingObject, setEditingObject] = useState<Item | null>(null);
    const [newUid, setNewUid] = React.useState<string>("")

    const renderEvents = () => {
        return <div/>
    }

    const renderEventHosts = () => {
        return <div/>
    }

    return (<Grid className="events-editor-grid">
        <Row className="event-show-grid">
            <Col xs={16}>
                <div className='events-grid-header'>
                    Events
                </div>
                {renderEvents()}
            </Col>
            <Col xs={6}>
                <div className='events-grid-header'>
                    Event hosts
                </div>
                {renderEventHosts()}
            </Col>
        </Row>
    </Grid>
    )
};

export default EventsEditorTab;
