import React, { useState, useEffect } from 'react';
import { ButtonGroup, IconButton } from 'rsuite';
import { IUpds } from '../App';
import Dialog, { createDialogLink, DialogLink, DialogWindow } from '../game/Dialog';
import { GameDescription } from '../game/GameDescription';
import { removeByIndex } from '../Utils';
import { DialogHandlers } from './DialogEditor';
import LinkEditor from './linkedit/LinkEditor';
import LinkShortView from './linkedit/LinkShortView';
import PasteButton from './common/copypaste/PasteButton';
import PlusRoundIcon from '@rsuite/icons/PlusRound';
import VerifyRoundIcon from '@rsuite/icons/VerifyRound';
import { Draggable } from "react-drag-reorder";
import Character from '../game/Character';

interface LinksEditorPanelProps {
    links: DialogLink[];
    dialog: Dialog | null;
    handlers: IUpds;
    game: GameDescription;
    onChange: (links: DialogLink[]) => void;
    window: DialogWindow | null;
    dialogHandlers?: DialogHandlers;
    window_uid: string;
    char?: Character
}

const LinksEditorPanel: React.FC<LinksEditorPanelProps> = ({ char, window_uid, links, dialog, game, onChange,
    window, handlers, dialogHandlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [reorderMenu, setReorderMenu] = useState<boolean>(false);

    useEffect(() => {
        setEditingIndex(-1);
        setReorderMenu(false);
    }, [window_uid]);

    const onLinkClick = (index: number) => {
        setEditingIndex(index)
    }

    const onCreateNew = () => {
        const newLinks = [...links, createDialogLink()]
        onChange(newLinks);
        setEditingIndex(links.length);
    }

    const onPaste = (link: any, typename: string) => {
        if (typename !== 'link') {
            console.error(`Pasted not link, but ${typename}`)
            return
        }
        const newLinks = [...links, link as DialogLink]
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
            <LinkEditor char={char} dialogHandlers={dialogHandlers} game={game} dialog={dialog} window={window} onLinkRemove={onLinkRemove} link={links[editingIndex]} index={editingIndex} onLinkChange={onLinkChange} onEditingDone={onEditingDone} handlers={handlers} />
        </div>
    } else {
        // view mode
        const linksList = links.map((el, index) => {
            return <LinkShortView index={index} key={index} link={el} onLinkClick={onLinkClick}></LinkShortView>
        })
        linksEditorContent = <div className='links-list'>
            {linksList}
            <div className='links-editor-instrument-keys'>
            <ButtonGroup>
                <IconButton icon={<PlusRoundIcon />} onClick={() => onCreateNew()}>Create link</IconButton>
                <IconButton icon={<VerifyRoundIcon />} onClick={() => setReorderMenu(true)}>Reorder</IconButton>
                <PasteButton handlers={handlers} typenames={['link']} onPasteClick={onPaste} />
            </ButtonGroup>
            </div>
        </div>
    }

    const getChangedPos = (currentPos: number, newPos: number) => {
        const copy = [...links]
        const [dragged] = copy.splice(currentPos, 1)
        copy.splice(newPos, 0, dragged)
        onChange(copy)
      };

    const renderLinksReorder = () => {
        return <Draggable onPosChange={getChangedPos}>
            {links.map((link, idx) => {
              return (
                <div key={idx} className="flex-item">
                  <LinkShortView index={idx} key={idx} link={link} onLinkClick={onLinkClick} noninteractive/>
                </div>
              );
            })}
          </Draggable>
    }

    return (
        reorderMenu ? <div className='links-editor-reorder'>
            {renderLinksReorder()}
            <IconButton icon={<VerifyRoundIcon />} onClick={() => setReorderMenu(false)}>Reorder done</IconButton>
            <p>Drag and drop links to reorder</p>
        </div> : <div className='links-editor-panel'>{linksEditorContent}</div>
    );
};

export default LinksEditorPanel;
