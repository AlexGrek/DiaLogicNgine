import React, { useState, useEffect } from 'react';
import Loc from '../../../game/Loc';
import { Button, Col, Drawer, Grid, Input, Row } from 'rsuite';
import PublicFileUrl, { IMAGES } from '../../common/PublicFileUrl';
import LinksEditorPanel from '../../LinksEditorPanel';
import { DialogLink, DialogWindow } from '../../../game/Dialog';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import TextListEditor from '../../common/text_list/TextListEditor';
import { TextList } from '../../../game/TextList';

interface LocEditorProps {
    loc: Loc;
    open: boolean;
    onUpdateLocation: (updates: Loc) => void;
    onClose: () => void;
    game: GameDescription
    handlers: IUpds;
}

const LocEditor: React.FC<LocEditorProps> = ({ loc, onUpdateLocation, onClose, open, handlers, game }) => {
    const [location, setlocation] = useState<Loc>(loc);
    useEffect(() => {
        setlocation(loc);
    }, [loc]);

    const onCloseHandler = (save: boolean) => {
        if (save) {
            onUpdateLocation(location)
        }
        onClose()
    }

    const onDelete = () => {
        setlocation({...location, uid: ""})
        onUpdateLocation({...location, uid: ""})
        onClose()
    }

    const displayNameChange = (val: string) => setlocation({ ...location, displayName: val })
    const uidNameChange = (val: string) => setlocation({ ...location, uid: val })
    const thumbChange = (val?: string) => setlocation({ ...location, thumbnail: val })
    const linksChange = (val: DialogLink[]) => setlocation({ ...location, links: val })
    const textChange = (val: TextList) => setlocation({ ...location, text: val })

    return (
        <Drawer size="full" placement="bottom" open={open} onClose={() => onCloseHandler(true)}>
            <Drawer.Header>
                <Drawer.Title>{loc.uid}</Drawer.Title>
                <Drawer.Actions>
                <Button onClick={() => onDelete()} appearance="ghost" color='red'>
                        Delete
                    </Button>
                    <Button onClick={() => onCloseHandler(false)} appearance="ghost" color="blue">
                        Discard
                    </Button>
                    <Button onClick={() => onCloseHandler(true)} appearance="primary">
                        Save
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body className="window-editor-drawer-body">

                <Grid className="window-editor-grid">
                    <Row className="show-grid">
                        <Col xs={6}>
                            <div className='location-params'>
                                <p>UID (has to be unique)</p>
                                <Input value={location.uid} onChange={uidNameChange}></Input>
                                <p>Thumbnail image</p>
                                <PublicFileUrl extensions={IMAGES} value={location.thumbnail} onChange={thumbChange}></PublicFileUrl>
                            </div>
                        </Col>
                        <Col xs={12}>
                            <div className='location-params'>
                                <p>Name</p>
                                <Input value={location.displayName} onChange={displayNameChange}></Input>
                                <p>Display text</p>
                                <TextListEditor textList={location.text} onChange={textChange}></TextListEditor>
                            </div>
                        </Col>
                        <Col xs={6}>
                            <div className='link-editor'>
                                <LinksEditorPanel links={location.links} dialog={null} handlers={handlers} game={game} onChange={linksChange} window={null} window_uid={loc.uid}></LinksEditorPanel>
                            </div>
                        </Col>
                    </Row>
                </Grid>



            </Drawer.Body>
        </Drawer>
    );
};

export default LocEditor;
