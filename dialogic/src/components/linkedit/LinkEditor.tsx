import PagePreviousIcon from '@rsuite/icons/PagePrevious';
import TrashIcon from '@rsuite/icons/Trash';
import 'animate.css';
import lodash from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { Button, ButtonToolbar, Checkbox, Divider, IconButton, Input, InputPicker, Panel, PanelGroup, Stack, Toggle, Tooltip, Whisper } from 'rsuite';
import { IUpds } from '../../App';
import { genRandomAlphanumericString, prependToCode, stringEnumEntries } from '../../Utils';
import { createDialogWindowId } from '../../exec/GameState';
import Dialog, { DialogLink, DialogLinkDirection, DialogWindow, LinkType, createWindow } from '../../game/Dialog';
import { GameDescription } from '../../game/GameDescription';
import { createBoolProp } from '../../game/Prop';
import ButtonPanelSelector from '../ButtonPanelSelector';
import { DialogHandlers } from '../DialogEditor';
import LinkTypeTag from '../LinkTypeTag';
import CodeSampleButton from '../common/CodeSampleButton';
import DialogWindowPicker from '../common/DialogWindowPicker';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../common/code_editor/PopupCodeEditor';
import CopyButton from '../common/copypaste/CopyButton';
import Magic, { MagicOperation } from '../common/magic/Magic';
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
    [LinkType.Local]: "Move to another window in same dialogm keeping the stack",
    [LinkType.Pop]: "Move to previous level (one level back), pop stack",
    [LinkType.Push]: "Move to next level, possible to another dialog (one level down), push stack",
    [LinkType.NavigateToLocation]: "Move to location, clearing all the stack",
    [LinkType.TalkToPerson]: "Talk to person, push stack",
    [LinkType.Jump]: "Move to another dialog/window keeping the stack",
    [LinkType.ResetJump]: "Move to another dialog/window clearing the stack",
    [LinkType.QuickReply]: "Reply without changing window"
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

    const editReply = (linkdir: DialogLinkDirection, isMain: boolean, aindex: number, str: string) => {
        const linkDirUpdate: DialogLinkDirection = { ...linkdir, replyText: str };

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
        if (linkdir.type === LinkType.Push || linkdir.type === LinkType.Jump || linkdir.type === LinkType.ResetJump) {
            if (linkdir.qualifiedDirection === undefined) {
                linkdir.qualifiedDirection = game.startupDialog
            }
            return <DialogWindowPicker dialogs={game.dialogs} chosen={[linkdir.qualifiedDirection.dialog, linkdir.qualifiedDirection.window]} onValueChange={(d, w) => editPushDirection(linkdir, isMainLink, aindex, d, w)} />
        }
        if (linkdir.type === LinkType.NavigateToLocation) {
            return <LocationPicker locs={game.locs} value={linkdir.direction || ''} onLocChange={(value) => editLocalDirection(linkdir, isMainLink, aindex, value)} />
        }
        if (linkdir.type === LinkType.QuickReply) {
            return <Input value={linkdir.replyText || ""} onChange={value => editReply(linkdir, isMainLink, aindex, value)} placeholder='reply text' />
        }
        return <div></div>
    }

    const magicOperationMakeVisibleOnce: MagicOperation = {
        name: 'Usable once',
        parameters: {
            "property_uid": `_visited_${genRandomAlphanumericString(6)}`
        },
        descr: 'Link will be invisible after user clicks it once, creates prop and script',
        onApply: function (op: MagicOperation): string | null {
            const prop = op.parameters["property_uid"]
            handlers.createProp(createBoolProp(prop, false))
            const isVisible = `return !props.${prop};`
            const action = `props.${prop} = true;`
            const linkUpdate = {
                ...link,
                isVisible: prependToCode(isVisible, link.isVisible),
                actionCode: prependToCode(action, link.actionCode)
            };
            onLinkChange(linkUpdate, index)
            return null
        }
    }
    const magic = <Magic game={game} operations={[magicOperationMakeVisibleOnce]} />
    const copyButton = <CopyButton handlers={handlers} typename="link" obj={link}/>

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
        return <PopupCodeEditor ui={ui} game={game} code={code || ""} onSaveClose={(s) => onSaveClose(menu, s)} open={codeEditorOpen}></PopupCodeEditor>
    }

    const getAlternativeDirection = (index?: number) => {
        const i = index ? index : 0
        return link.alternativeDirections[i]
    }

    const linkEditorDirection = (isMainDirection: boolean, alternativeDirectionIndex: number) => {
        const dir = isMainDirection ? link.mainDirection : getAlternativeDirection(alternativeDirectionIndex);
        return <div className="link-editor-direction">
            <ButtonToolbar>
                <ButtonPanelSelector tooltips={filteredTooltips} chosen={dir.type} variants={enumKeys} buttonData={enumNames} onValueChanged={(value) => editType(dir, isMainDirection, alternativeDirectionIndex, value)} ></ButtonPanelSelector>
            </ButtonToolbar>
            {directionEditor(dir, isMainDirection, alternativeDirectionIndex)}
        </div>
    }

    const onChangeLocationInBgCheck = (value: boolean) => {
        const newValue = value ? "" : undefined
        onLinkChange({ ...link, changeLocationInBg: newValue }, index)
    }

    const onChangeLocationInBg = (value: string) => {
        onLinkChange({ ...link, changeLocationInBg: value }, index)
    }


    return (
        <div className="link-editor-body animate__animated animate__fadeInRight animate__faster">
            <Stack alignItems="center" justifyContent='space-between' className="link-editor-toolbar">
                <IconButton icon={<PagePreviousIcon />} placement="left" onClick={() => editingDone()}>
                    Done
                </IconButton>
                {magic}
                {copyButton}
                <IconButton icon={<TrashIcon />} appearance='subtle' placement="left" onClick={() => linkRemoved()}>
                </IconButton>
            </Stack>
            <Divider></Divider>
            <p>Text:</p>
            <Input onChange={editText} ref={txtInput} placeholder="Answer text" value={link.text}></Input>
            <PanelGroup accordion>
                <Panel header="Direction" defaultExpanded>
                    {linkEditorDirection(true, 0)}
                </Panel>
                <Panel header="Scripting">
                    <CodeSampleButton onClick={() => codeEdit("actionCode")} name='action' code={link.actionCode}></CodeSampleButton>
                    <CodeSampleButton onClick={() => codeEdit("isVisible")} name='isVisible' code={link.isVisible}></CodeSampleButton>
                    <CodeSampleButton onClick={() => codeEdit("isEnabled")} name='isEnabled' code={link.isEnabled}></CodeSampleButton>
                </Panel>
                <Panel header="Misc">
                    <Checkbox checked={link.changeLocationInBg !== undefined} onChange={(value, checked) => onChangeLocationInBgCheck(checked)}>Change location</Checkbox>
                    {link.changeLocationInBg === undefined ? null : <LocationPicker locs={game.locs} value={link.changeLocationInBg} onLocChange={onChangeLocationInBg} />}
                </Panel>
                <Panel header="Alternatives">
                    <div className='link-editor-section'>
                        <Toggle checked={link.isAlternativeLink === undefined ? false : link.isAlternativeLink} onChange={value => swithAlternativeLink(value)}></Toggle> Alternative direction
                        {link.isAlternativeLink ? <CodeSampleButton onClick={() => codeEdit("alternative")} name='useAlternativeWhen' code={link.useAlternativeWhen}></CodeSampleButton> : null}
                        {link.isAlternativeLink ? linkEditorDirection(false, 0) : null}
                    </div>
                </Panel>
            </PanelGroup>
            {renderCodeEditor(codeEditorMenu)}
        </div>

    );
};

export default LinkEditor;
