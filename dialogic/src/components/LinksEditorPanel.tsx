import React, { useState, useEffect } from 'react';
import { Button } from 'rsuite';
import { IUpds } from '../App';
import Dialog, { createDialogLink, DialogLink, DialogWindow } from '../game/Dialog';
import { GameDescription } from '../game/GameDescription';
import { removeByIndex } from '../Utils';
import { DialogHandlers } from './DialogEditor';
import LinkEditor from './linkedit/LinkEditor';
import LinkShortView from './linkedit/LinkShortView';

interface LinksEditorPanelProps {
    links: DialogLink[];
    dialog: Dialog | null;
    handlers: IUpds;
    game: GameDescription;
    onChange: (links: DialogLink[]) => void;
    window: DialogWindow | null;
    dialogHandlers?: DialogHandlers;
    window_uid: string;
}

const LinksEditorPanel: React.FC<LinksEditorPanelProps> = ({ window_uid, links, dialog, game, onChange, 
    window, handlers, dialogHandlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    useEffect(() => {
        setEditingIndex(-1);
    }, [window_uid]);

    const onLinkClick = (index: number) => {
        setEditingIndex(index)
    }

    const onCreateNew = () => {
        const newLinks = [...links, createDialogLink() ]
        onChange(newLinks);
        setEditingIndex(links.length);
    }

    const onEditingDone = () => {
        setEditingIndex(-1);
    }

    const onLinkChange = (link: DialogLink, index: number) => {
        const newLinkList = links.slice();
        newLinkList[index] = link;
        // console.log(`Links: ${JSON.stringify(newLinkList)}`)
        onChange(newLinkList);
    }

    const onLinkRemove = (index: Number) => {
        const newLinkList = removeByIndex(links, index);
        onChange(newLinkList);
    }

    let linksEditorContent = null
    if (editingIndex >= 0) {
        // editing mode
        linksEditorContent = <div>
            <LinkEditor dialogHandlers={dialogHandlers} game={game} dialog={dialog} window={window} onLinkRemove={onLinkRemove} link={links[editingIndex]} index={editingIndex} onLinkChange={onLinkChange} onEditingDone={onEditingDone} handlers={handlers}/>
        </div>
    } else {
        // view mode
        let linksList = links.map((el, index) => {
            console.log(`Link: ${el}`)
            return <LinkShortView index={index} key={index} link={el} onLinkClick={onLinkClick}></LinkShortView>
        })
        linksEditorContent = <div>
            {linksList}
            <Button onClick={() => onCreateNew()}>ADD</Button>
        </div>
    }

    return (
        <div className='links-editor-panel'>{linksEditorContent}</div>
    );
};

export default LinksEditorPanel;
