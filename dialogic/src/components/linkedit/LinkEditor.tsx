import React, { useEffect, useRef, useState } from 'react';
import 'animate.css';
import { AutoComplete, Button, ButtonGroup, ButtonToolbar, Form, IconButton, Input, InputPicker, Stack, Tag, Toggle, Tooltip, Whisper } from 'rsuite';
import PagePreviousIcon from '@rsuite/icons/PagePrevious';
import TrashIcon from '@rsuite/icons/Trash';
import Dialog, { createDialog, createDialogLink, createWindow, DialogLink, DialogLinkDirection, DialogWindow, LinkType } from '../../game/Dialog';
import { Divider } from 'rsuite';
import ExitIcon from '@rsuite/icons/Exit';
import ButtonPanelSelector from '../ButtonPanelSelector';
import { KeyValuePair, stringEnumEntries } from '../../Utils';
import LinkTypeTag from '../LinkTypeTag';
import { GameDescription } from '../../game/GameDescription';
import { IUpds } from '../../App';
import { DialogHandlers } from '../DialogEditor';
import { createDialogWindowId } from '../../exec/GameState';
import DialogWindowPicker from '../common/DialogWindowPicker';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../common/code_editor/PopupCodeEditor';
import CodeSampleButton from '../common/CodeSampleButton';
import Loc from '../../game/Loc';
import lodash from 'lodash';
import LocationPicker from './LocationPicker';

const CODE_EDITOR_UI_ACTION: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    "functionName": "afterLinkFollowed",
    "functionTemplates": {
        "no action": "",
        "log": "console.log(state);"
    },
    "header": "action code edit"
}

const CODE_EDITOR_UI_ISVISIBLE: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    "functionName": "isVisible",
    "functionTemplates": {
        "always visible": "",
        "always invisible": "return false;"
    },
    "header": "isVisible -> boolean // if link is visible or not"
}

const CODE_EDITOR_UI_ISENABLED: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    "functionName": "isEnabled",
    "functionTemplates": {
        "always enabled": "",
        "always disabled": "return false;"
    },
    "header": "isEnabled -> boolean // if link is enabled or not"
}

const CODE_EDITOR_UI_ALTERNATIVE: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    "functionName": "useAlternativeWhen",
    "functionTemplates": {
        "never": "",
        "always": "return true;"
    },
    "header": "useAlternativeWhen -> boolean // if true then follow alternative link"
}


interface LinkEditorProps {
    link: DialogLink;
    index: number;
    onLinkChange: (link: DialogLink, index: number) => void;
    onLinkRemove: (index: number) => void;

    onEditingDone: Function;
    // need to be able to do anything
    dialog: Dialog | null;
    window: DialogWindow | null;
    game: GameDescription;
    handlers: IUpds;
    dialogHandlers?: DialogHandlers;
}

type CodeEditMenu = "actionCode" | "isVisible" | "isEnabled" | "alternative"

const TooltipText: { [key: string]: string } = {
    [LinkType.Local]: "Move to another window in same dialog",
    [LinkType.Pop]: "Move to previous level (one level back)",
    [LinkType.Push]: "Move to next level, possible to another dialog (one level down)",
    [LinkType.NavigateToLocation]: "Move to location, clearing all dialog stack",
    [LinkType.TalkToPerson]: "Talk to person"
}

const LinkEditor: React.FC<LinkEditorProps> = ({ link, index, dialog, onLinkChange, game, handlers, window,
    onEditingDone, onLinkRemove, dialogHandlers }) => {

    const txtInput = useRef<any>(null);
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false);
    const [codeEditorMenu, setCodeEditorMenu] = useState<CodeEditMenu>("actionCode");

    useEffect(() => {
        if (txtInput.current) {
            setTimeout(() => txtInput.current.focus(), 300);
        }
    }, [])

    const editingDone = () => {
        onEditingDone()
    }

    const codeEdit = (menu: CodeEditMenu) => {
        setCodeEditorMenu(menu)
        setCodeEditorOpen(true)
    }

    const openCloseCodeEditor = (next: boolean) => {
        setCodeEditorOpen(next);
    }

    const swithAlternativeLink = (enable: boolean) => {
        const linkCopy = lodash.cloneDeep(link)
        if (enable && link.alternativeDirections.length < 1) {
            linkCopy.alternativeDirections.push({ type: LinkType.Local, direction: "" })
        }
        if (!enable && link.alternativeDirections.length === 1) {
            linkCopy.alternativeDirections = []
        }
        onLinkChange({ ...linkCopy, isAlternativeLink: enable }, index)
    }

    const editText = (s: string) => {
        const linkUpdate = { ...link, text: s };
        onLinkChange(linkUpdate, index);
    }

    const editCode = (menu: CodeEditMenu, update: string) => {
        var linkUpdate = link;
        var updateOrUndef: string | undefined = update
        if (update == "") {
            updateOrUndef = undefined
        }
        switch (menu) {
            case "actionCode":
                linkUpdate = { ...link, actionCode: updateOrUndef };
                break;
            case "isEnabled":
                linkUpdate = { ...link, isEnabled: updateOrUndef };
                break;
            case "isVisible":
                linkUpdate = { ...link, isVisible: updateOrUndef };
                break;
            case "alternative":
                linkUpdate = { ...link, useAlternativeWhen: updateOrUndef }
        }

        onLinkChange(linkUpdate, index);
        setCodeEditorOpen(false);
    }

    const editType = (linkdir: DialogLinkDirection, isMain: boolean, aindex: number, type: LinkType) => {
        const linkDirUpdate = { ...linkdir, type: type };

        var linkUpdate = lodash.cloneDeep(link)
        if (isMain) {
            linkUpdate.mainDirection = linkDirUpdate
        } else {
            linkUpdate.alternativeDirections[aindex] = linkDirUpdate
        }

        onLinkChange(linkUpdate, index);
    }

    const editLocalDirection = (linkdir: DialogLinkDirection, isMain: boolean, aindex: number, str: string) => {
        const linkDirUpdate = { ...linkdir, direction: str };

        var linkUpdate = lodash.cloneDeep(link)
        if (isMain) {
            linkUpdate.mainDirection = linkDirUpdate
        } else {
            linkUpdate.alternativeDirections[aindex] = linkDirUpdate
        }

        onLinkChange(linkUpdate, index);
    }

    const editPushDirection = (linkdir: DialogLinkDirection, isMain: boolean, aindex: number, d: string | null, w: string | null) => {
        if (d && w) {
            const id = createDialogWindowId(d, w);
            const linkDirUpdate = { ...linkdir, qualifiedDirection: id }

            var linkUpdate = lodash.cloneDeep(link)
            if (isMain) {
                linkUpdate.mainDirection = linkDirUpdate
            } else {
                linkUpdate.alternativeDirections[aindex] = linkDirUpdate
            }

            onLinkChange(linkUpdate, index);
        }
    }

    const linkRemoved = () => {
        onEditingDone();
        onLinkRemove(index);
    }

    const isAllowedLinkType = (linkType: LinkType) => {
        if (dialog != null) {
            return true;
        }
        // we are not in dialog, local and pop links are not available
        return !(linkType == LinkType.Local || linkType == LinkType.Pop)

    }

    const linkTypes = stringEnumEntries(LinkType).filter((el) => isAllowedLinkType(el.value))
    const enumKeys = linkTypes.map(el => el.value);
    const enumNames = linkTypes.map(el => {
        const key = el.value
        const tooltip = <Tooltip>{TooltipText[key]}</Tooltip>
        return <Whisper placement="top" controlId="control-id-hover" trigger="hover" speaker={tooltip}>
            <LinkTypeTag value={key}></LinkTypeTag>
        </Whisper>
    });

    const onCreateLocalDialog = (str: string) => {
        if (dialogHandlers)
            dialogHandlers.createDialogWindowHandler(createWindow(str))
    }

    const createLink = (linkdir: DialogLinkDirection) =>
        <span>Not found. <Button disabled={!linkdir.direction} onClick={() => linkdir.direction ? onCreateLocalDialog(linkdir.direction) : null} appearance='link'>Create?</Button></span>

    const onGotoLocalLink = (link: string) => {
        if (!dialog || !window) {
            return;
        }
        const foundWindow = dialog.windows.find(el => el.uid === link);
        if (foundWindow) {
            handlers.handleDialogWindowChange(window, null);
            if (dialogHandlers)
                dialogHandlers.openAnotherWindowHandler(foundWindow);
        }
        else {
            console.warn("Attempt to open non-existent link " + link)
        }
    }

    const gotoLink = (linkdir: DialogLinkDirection) =>
        <span><Button appearance='link' onClick={() => onGotoLocalLink(linkdir.direction || "")}>Go to link</Button></span>

    const directionEditor = (linkdir: DialogLinkDirection, isMainLink: boolean, aindex: number) => {
        if (dialog != null && linkdir.type === LinkType.Local) {
            const data = dialog.windows.map(d => d.uid);
            const formattedData = data.map(d => ({ value: d, label: d }));
            return <div>
                <InputPicker onCreate={(value, item, event) => onCreateLocalDialog(value)} creatable={true} data={formattedData} value={linkdir.direction} onChange={(value) => editLocalDirection(linkdir, isMainLink, aindex, value)}></InputPicker>
                <p>{data.includes(linkdir.direction || "") ? gotoLink(linkdir) : createLink(linkdir)}</p>
            </div>
        }
        if (linkdir.type === LinkType.Push) {
            if (linkdir.qualifiedDirection === undefined) {
                linkdir.qualifiedDirection = game.startupDialog
            }
            return <DialogWindowPicker dialogs={game.dialogs} chosen={[linkdir.qualifiedDirection.dialog, linkdir.qualifiedDirection.window]} onValueChange={(d, w) => editPushDirection(linkdir, isMainLink, aindex, d, w)}></DialogWindowPicker>
        }
        if (linkdir.type === LinkType.NavigateToLocation) {
            return <LocationPicker locs={game.locs} value={linkdir.direction || ''} onLocChange={(value) => editLocalDirection(linkdir, isMainLink, aindex, value)}/>
        }
        return <div></div>
    }

    const tooltips = lodash.cloneDeep(TooltipText)
    const filteredTooltips = Object.fromEntries(Object.entries(tooltips));

    const renderCodeEditor = (menu: CodeEditMenu) => {
        var code: string | undefined = ""
        var onSaveClose = editCode
        var ui = CODE_EDITOR_UI_ACTION
        switch (menu) {
            case "actionCode":
                code = link.actionCode
                ui = CODE_EDITOR_UI_ACTION
                break;
            case "isVisible":
                code = link.isVisible
                ui = CODE_EDITOR_UI_ISVISIBLE
                break;
            case "isEnabled":
                code = link.isEnabled
                ui = CODE_EDITOR_UI_ISENABLED
                break;
            case "alternative":
                code = link.useAlternativeWhen
                ui = CODE_EDITOR_UI_ALTERNATIVE
                break;
        }
        return <PopupCodeEditor ui={ui} code={code || ""} onSaveClose={(s) => onSaveClose(menu, s)} open={codeEditorOpen}></PopupCodeEditor>
    }

    const getAlternativeDirection = (index?: number) => {
        const i = index ? index : 0
        return link.alternativeDirections[i]
    }

    const linkEditorDirection = (isMainDirection: boolean, alternativeDirectionIndex: number) => {
        const dir = isMainDirection ? link.mainDirection : getAlternativeDirection(alternativeDirectionIndex);
        return <div className="link-editor-direction">
            <p>Direction:</p>
            <ButtonToolbar>
                <ButtonPanelSelector tooltips={filteredTooltips} chosen={dir.type} variants={enumKeys} buttonData={enumNames} onValueChanged={(value) => editType(dir, isMainDirection, alternativeDirectionIndex, value)} ></ButtonPanelSelector>
            </ButtonToolbar>
            {directionEditor(dir, isMainDirection, alternativeDirectionIndex)}
        </div>
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

            {linkEditorDirection(true, 0)}
            <Divider></Divider>
            <p>Scripting:</p>
            <CodeSampleButton onClick={() => codeEdit("actionCode")} name='action' code={link.actionCode}></CodeSampleButton>
            <CodeSampleButton onClick={() => codeEdit("isVisible")} name='isVisible' code={link.isVisible}></CodeSampleButton>
            <CodeSampleButton onClick={() => codeEdit("isEnabled")} name='isEnabled' code={link.isEnabled}></CodeSampleButton>
            <div className='link-editor-section'>
                <Toggle checked={link.isAlternativeLink} onChange={value => swithAlternativeLink(value)}></Toggle> Alternative direction
                {link.isAlternativeLink ? <CodeSampleButton onClick={() => codeEdit("alternative")} name='useAlternativeWhen' code={link.useAlternativeWhen}></CodeSampleButton> : null}
                {link.isAlternativeLink ? linkEditorDirection(false, 0) : null}
            </div>
            {renderCodeEditor(codeEditorMenu)}
        </div>

    );
};

export default LinkEditor;
