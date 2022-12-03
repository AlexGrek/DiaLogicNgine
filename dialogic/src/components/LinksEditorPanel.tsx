import React, { useState, useEffect } from 'react';
import { Button } from 'rsuite';
import Dialog, { createDialogLink, DialogLink, DialogWindow } from '../game/Dialog';
import { GameDescription } from '../game/GameDescription';
import LinkEditor from './linkedit/LinkEditor';
import LinkShortView from './linkedit/LinkShortView';

interface LinksEditorPanelProps {
    links: DialogLink[];
    dialog: Dialog;
    game: GameDescription;
    onChange: (modificator: (input: DialogWindow) => DialogWindow) => void;
}

const LinksEditorPanel: React.FC<LinksEditorPanelProps> = ({ links, dialog, onChange }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    useEffect(() => {
        setEditingIndex(-1);
    }, []);

    const onLinkClick = (index: number) => {
        setEditingIndex(index)
    }

    const onCreateNew = () => {
        const updater = (window: DialogWindow) => { return { ...window, links: [...window.links, createDialogLink() ] } }
        onChange(updater);
    }

    const onEditingDone = () => {
        setEditingIndex(-1);
    }

    const onLinkChange = (link: DialogLink, index: number) => {
        const newLinkList = links.slice();
        newLinkList[index] = link;
        const updater = (window: DialogWindow) => { return { ...window, links: newLinkList } };
        onChange(updater);
    }

    let linksEditorContent = null
    if (editingIndex >= 0) {
        // editing mode
        linksEditorContent = <div>
            <LinkEditor link={links[editingIndex]} index={editingIndex} onLinkChange={onLinkChange} onEditingDone={onEditingDone}/>
        </div>
    } else {
        // view mode
        let linksList = links.map((el, index) => {
            console.log(`Link: ${el}`)
            return <LinkShortView index={index} key={index} link={el} onLinkClick={onLinkClick} dialog={dialog}></LinkShortView>
        })
        linksEditorContent = <div>
            <p>Total links: {links.length}</p>
            {linksList}
            <Button onClick={() => onCreateNew()}>ADD</Button>
        </div>
    }

    return (
        <div className='links-editor-panel'>{linksEditorContent}</div>
    );
};

export default LinksEditorPanel;
