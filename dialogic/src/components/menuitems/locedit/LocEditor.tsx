import React, { useState, useEffect } from 'react';
import Loc from '../../../game/Loc';
import { Button, Drawer, Input } from 'rsuite';
import PublicFileUrl, { IMAGES } from '../../common/PublicFileUrl';

interface LocEditorProps {
    loc: Loc;
    open: boolean;
    onUpdateLocation: (updates: Loc) => void;
    onClose: () => void;
}

const LocEditor: React.FC<LocEditorProps> = ({ loc, onUpdateLocation, onClose, open }) => {
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

    const displayNameChange = (val: string) => setlocation({...location, displayName: val})
    const uidNameChange = (val: string) => setlocation({...location, uid: val})
    const thumbChange = (val?: string) => setlocation({...location, thumbnail: val})
 
    return (
        <Drawer size="full" placement="bottom" open={open} onClose={() => onCloseHandler(true)}>
            <Drawer.Header>
                <Drawer.Title>{loc.uid}</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => onCloseHandler(true)} appearance="primary">
                        Save
                    </Button>
                    <Button onClick={() => onCloseHandler(false)} appearance="ghost">
                        Discard
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body className="window-editor-drawer-body">
                <p>Name</p>
                <Input value={location.displayName} onChange={displayNameChange}></Input>
                <p>UID (has to be unique)</p>
                <Input value={location.uid} onChange={uidNameChange}></Input>
                <p>Thumbnail image</p>
                <PublicFileUrl extensions={IMAGES} value={location.thumbnail} onChange={thumbChange}></PublicFileUrl>
            </Drawer.Body>
        </Drawer>
    );
};

export default LocEditor;
