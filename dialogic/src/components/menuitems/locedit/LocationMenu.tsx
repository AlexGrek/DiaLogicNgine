import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import Loc from '../../../game/Loc';
import LocationPreview from './LocationPreview';
import { Button, Notification } from 'rsuite';
import './loc.css'
import LocEditor from './LocEditor';
import { emptyImageList } from '../../../game/ImageList';
import Note from '../../userguide/Note';

interface LocationMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
    visible: boolean
}

const LocationMenu: React.FC<LocationMenuProps> = ({ game, onSetGame, handlers, visible }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [creatingNew, setCreatingNew] = useState<boolean>(false);
    useEffect(() => {
        setEditingIndex(editingIndex);
    }, [game]);

    if (!visible) {
        return <div/>
    }

    const edit = (i: number) => {
        setEditingIndex(i)
        setCreatingNew(false)
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
        setCreatingNew(true)
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
            let updatedLocArray = game.locs
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
                <Button onClick={() => createNew()}>+</Button>
            </div>
          </div>
        </div>
    );
};

export default LocationMenu;
