import React, { useEffect, useRef } from 'react';
import 'animate.css';
import { AutoComplete, Button, ButtonGroup, ButtonToolbar, Form, IconButton, Input, InputPicker, Stack, Tag, Tooltip, Whisper } from 'rsuite';
import PagePreviousIcon from '@rsuite/icons/PagePrevious';
import TrashIcon from '@rsuite/icons/Trash';
import Dialog, { createDialog, createDialogLink, createWindow, DialogLink, DialogWindow, LinkType } from '../../game/Dialog';
import { Divider } from 'rsuite';
import ExitIcon from '@rsuite/icons/Exit';
import ButtonPanelSelector from '../ButtonPanelSelector';
import { allEnumPairsOf } from '../../Utils';
import LinkTypeTag from '../LinkTypeTag';
import { GameDescription } from '../../game/GameDescription';
import { IUpds } from '../../App';
import { DialogHandlers } from '../DialogEditor';

interface LinkEditorProps {
    link: DialogLink;
    index: number;
    onLinkChange: (link: DialogLink, index: number) => void;
    onLinkRemove: (index: number) => void;
    
    onEditingDone: Function;
    // need to be able to do anything
    dialog: Dialog;
    window: DialogWindow;
    game: GameDescription;
    handlers: IUpds;
    dialogHandlers: DialogHandlers;
}

const TooltipText = {
    [LinkType.Local]: "Move to another window in same dialog",
    [LinkType.Pop]: "Move to previous level (one level back)",
    [LinkType.Push]: "Move to next level, possible to another dialog (one level down)"
}

const LinkEditor: React.FC<LinkEditorProps> = ({ link, index, dialog, onLinkChange, game, handlers, window,
    onEditingDone, onLinkRemove, dialogHandlers }) => {

    const txtInput = useRef<any>(null);

    useEffect(() => {
        if (txtInput.current) {
            setTimeout(() => txtInput.current.focus(), 300);
          }
    }, [])

    const editingDone = () => {
        onEditingDone()
    }

    const editText = (s: string) => {
        const linkUpdate = { ...link, text: s };
        onLinkChange(linkUpdate, index);
    }

    const editType = (type: LinkType) => {
        const linkUpdate = { ...link, type: type };
        onLinkChange(linkUpdate, index);
    }

    const editLocalDirection = (str: string) => {
        const linkUpdate = { ...link, direction: str };
        onLinkChange(linkUpdate, index);
    }

    const linkRemoved = () => {
        onEditingDone();
        onLinkRemove(index);
    }

    const linkTypes = allEnumPairsOf(LinkType);
    const enumKeys = linkTypes.map(el => el.key);
    const enumNames = linkTypes.map(el => {
        const key: LinkType = el.key
        const tooltip = <Tooltip>{TooltipText[key]}</Tooltip>
        return <Whisper placement="top" controlId="control-id-hover" trigger="hover" speaker={tooltip}>
            <LinkTypeTag value={key}></LinkTypeTag>
        </Whisper>
    });

    const onCreateLocalDialog = (str: string) => {
        dialogHandlers.createDialogWindowHandler(createWindow(str))
    }

    const createLink = () =>
        <span>Not found. <Button disabled={!link.direction} onClick={() => link.direction ? onCreateLocalDialog(link.direction) : null} appearance='link'>Create?</Button></span>

    const onGotoLocalLink = (link: string) => {
        const foundWindow = dialog.windows.find(el => el.uid === link);
        if (foundWindow) {
            handlers.handleDialogWindowChange(window, null);
            dialogHandlers.openAnotherWindowHandler(foundWindow);
        }
        else{
            console.warn("Attempt to open non-existent link " + link)
        }
    }

    const gotoLink = () =>
        <span><Button appearance='link' onClick={() => onGotoLocalLink(link.direction || "")}>Go to link</Button></span>

    const directionEditor = () => {
        if (link.type === LinkType.Local) {
            const data = dialog.windows.map(d => d.uid);
            const formattedData = data.map(d => ({value: d, label: d}));
            return <div>
                <InputPicker onCreate={(value, item, event) => onCreateLocalDialog(value)} creatable={true} data={formattedData} value={link.direction} onChange={editLocalDirection}></InputPicker>
                <p>{data.includes(link.direction || "") ? gotoLink() : createLink()}</p>
            </div>
        }
        return <div></div>
    }

    return (
        <div className="link-editor-body animate__animated animate__fadeInRight animate__faster">
            <Stack alignItems="center" justifyContent='space-between' className="link-editor-toolbar">
                <IconButton icon={<PagePreviousIcon />} placement="left" onClick={() => editingDone()}>
                    Done
                </IconButton>
                <IconButton icon={<TrashIcon />} appearance='subtle' placement="left" onClick={() => linkRemoved()}>
                </IconButton>
            </Stack>
            <Divider></Divider>
            <p>Text:</p>
            <Input onChange={editText} ref={txtInput} placeholder="Answer text" value={link.text}></Input>

            <div className="link-editor-direction">
                <p>Direction:</p>
                <ButtonToolbar>
                    <ButtonPanelSelector tooltips={TooltipText} chosen={link.type} variants={enumKeys} buttonData={enumNames} onValueChanged={editType} ></ButtonPanelSelector>
                </ButtonToolbar>
                {directionEditor()}
            </div>
        </div>

    );
};

export default LinkEditor;
