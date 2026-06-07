import React, { useRef, useState } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import Loc from '../../../game/Loc';
import LocationPreview from './LocationPreview';
import { Button, Stack } from 'rsuite';
import './loc.css'
import LocEditor from './LocEditor';
import { emptyImageList } from '../../../game/ImageList';
import Note from '../../userguide/Note';
import PasteButton from '../../common/copypaste/PasteButton';
import lodash from 'lodash';

interface LocationMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const LocationMenu: React.FC<LocationMenuProps> = ({ game, handlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const skipResetRef = useRef(false);
    React.useEffect(() => {
        if (skipResetRef.current) {
            skipResetRef.current = false;
            return;
        }
        setEditingIndex(-1);
    }, [game]);

    const edit = (i: number) => {
        setEditingIndex(i)
    }

    const onPaste = (obj: unknown, typename: string, newUid?: string) => {
        if (typename !== 'loc' || newUid === undefined) return
        const pasted = lodash.cloneDeep(obj as Loc)
        pasted.uid = newUid
        pasted.routes = []
        skipResetRef.current = true
        const updated = [...game.locs, pasted]
        setEditingIndex(updated.length - 1)
        handlers.handleLocChange(updated)
    }

    const createNew = () => {
        const newEmptyLoc: Loc = {
            displayName: "",
            uid: "",
            goto: [],
            links: [],
            text: {
                main: "",
                list: []
            },
            routes: [],
            backgrounds: emptyImageList(),
            eventHosts: [],
            discussable: true
        }
        skipResetRef.current = true
        setEditingIndex(game.locs.length)
        handlers.handleLocChange([...game.locs, newEmptyLoc])
    }

    const locItems = (items: Loc[]) => {
        return items.map((item, i) => {
            return <LocationPreview location={item} key={i} index={i} onClick={edit}></LocationPreview>
        })
    }

    const editor = (index: number) => {
        const loc = game.locs[index]
        const editThisLoc = (update: Loc) => {
            const updatedLocArray = game.locs
            if (update.uid === '') {
                // remove this location
                updatedLocArray.splice(index, 1)
            } else {
                updatedLocArray[index] = update
            }

            handlers.handleLocChange(updatedLocArray)
        }
        return <LocEditor game={game} handlers={handlers} loc={loc} open={editingIndex >= 0} onUpdateLocation={editThisLoc} onClose={() => setEditingIndex(-1)}></LocEditor>
    }

    return (
        <div>
            <Note text='Create locations that can contain paths to other locations and NPCs' />
            {editingIndex >= 0 ? editor(editingIndex) : null}
            <div className="locItems">
                {locItems(game.locs)}
                <div className="locItemsPlus">
                    <Stack spacing={8}>
                        <Button onClick={() => createNew()}>+</Button>
                        <PasteButton requireNewUid onPasteClick={onPaste} handlers={handlers} typenames={['loc']} />
                    </Stack>
                </div>
            </div>
        </div>
    );
};

export default LocationMenu;
