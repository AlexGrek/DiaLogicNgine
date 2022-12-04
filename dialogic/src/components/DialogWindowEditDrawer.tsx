import React, { useState, useEffect } from 'react';
import { Button, Drawer, Input, Grid, Row, Col, Checkbox } from 'rsuite';
import { IUpds } from '../App';
import Dialog, { DialogWindow } from '../game/Dialog';
import { GameDescription } from '../game/GameDescription';
import { DialogHandlers } from './DialogEditor';
import LinksEditorPanel from './LinksEditorPanel';

interface DialogWindowEditDrawerProps {
    window: DialogWindow;
    dialog: Dialog;
    open: boolean;
    handlers: IUpds;
    onClose: Function;
    game: GameDescription;
    dialogHandlers: DialogHandlers;
}

const DialogWindowEditDrawer: React.FC<DialogWindowEditDrawerProps> = ({ window, dialog, open,
    handlers, onClose, game, dialogHandlers }) => {
    const [windowState, setWindow] = useState<DialogWindow>(window);
    const [changesMade, setChanges] = useState<boolean>(false);

    useEffect(() => {
        setWindow(window);
        setChanges(false);
    }, [window]);

    const modifyWindowBy = (modificator: (input: DialogWindow) => DialogWindow) => {
        setChanges(true);
        console.log("window changed");
        const newWindow = modificator(windowState);
        console.log(JSON.stringify(newWindow));
        setWindow(newWindow); // update window changes
    }

    const doNothing = (_: any) => {
        console.log("nothing done");
    }

    const onTextChange = (s: string) => {
        setChanges(true);
        setWindow({ ...windowState, text: s });
    }

    const onCloseHandler = (a: boolean) => {
        handlers.handleDialogWindowChange(windowState, null);
        onClose();
    }

    return (
        <Drawer size="full" placement="bottom" open={open} onClose={() => onCloseHandler(false)}>
            <Drawer.Header>
                <Drawer.Title>{windowState.uid}</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => onCloseHandler(false)} appearance="primary">
                        Save
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body className="window-editor-drawer-body">
                <Grid className="window-editor-grid">
                    <Row className="show-grid">
                        <Col xs={6}>
                            <div className='window-editor-grid-header'>
                                Related
                            </div>
                            <p>Display as JSON:</p>
                            <Input as='textarea' rows={6} readOnly value={JSON.stringify(windowState)}></Input>
                            <Checkbox checked={changesMade}>changes</Checkbox>
                        </Col>
                        <Col xs={12} className="window-editor-grid-content">
                            <div className='window-editor-grid-header'>
                                Content
                            </div>
                            <Input as="textarea" value={windowState.text} onChange={onTextChange} rows={5}></Input>
                        </Col>
                        <Col xs={6}>
                            <div className='window-editor-grid-header'>
                                Links
                            </div>
                            <LinksEditorPanel window_uid={window.uid} dialogHandlers={dialogHandlers} onChange={modifyWindowBy} links={windowState.links} dialog={dialog} game={game} handlers={handlers} window={windowState}></LinksEditorPanel>
                        </Col>
                    </Row>
                </Grid>
            </Drawer.Body>
        </Drawer>
    );
};

export default DialogWindowEditDrawer;
