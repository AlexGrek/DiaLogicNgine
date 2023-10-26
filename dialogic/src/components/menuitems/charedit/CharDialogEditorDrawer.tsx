import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Col, Divider, Drawer, Grid, Input, Panel, PanelGroup, Row } from 'rsuite';
import { IUpds } from '../../../App';
import Character, { Behavior, CharacterDialog, createCharacterDialog } from '../../../game/Character';
import { DialogLink } from '../../../game/Dialog';
import { GameDescription } from '../../../game/GameDescription';
import { TextList } from '../../../game/TextList';
import LinksEditorPanel from '../../LinksEditorPanel';
import CodeSampleButton from '../../common/CodeSampleButton';
import ConfirmDeleteButtonSmall from '../../common/ConfirmDeleteButtonSmall';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';
import ImageListEditor from '../../common/text_list/ImageListEditor';
import TextListEditor from '../../common/text_list/TextListEditor';
import './charmenu.css';
import BehaviorEditor from './BehaviorMenu';

const CODE_EDITOR_UI_NAMESELECTOR: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    "functionName": "chooseAltText",
    "functionTemplates": {
        "no action": "",
        "always main": "return 0;",
        "always first alternative": "return 1;"
    },
    "header": "alternative choose"
}

interface CharDialogEditorDrawerProps {
    value: Character;
    open: boolean;
    onUpdate: (char: Character) => void;
    onClose: () => void;
    game: GameDescription
    handlers: IUpds;
}

type CodeEditMenu = "canHostEventsScript" | "chooseTextScript" | "chooseBgScript"

const CharDialogEditorDrawer: React.FC<CharDialogEditorDrawerProps> = ({ value, onUpdate, onClose, open, handlers, game }) => {
    const [char, setChar] = useState<Character>(value);

    // enable code editor props
    const [codeEditMenu, setCodeEditMenu] = useState<CodeEditMenu>("chooseTextScript");
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false);

    useEffect(() => {
        setChar(value);
    }, [value]);

    const onCloseHandler = (save: boolean) => {
        if (save) {
            onUpdate(char)
        }
        onClose()
    }

    const renderCodeEditor = (menu: CodeEditMenu) => {
        if (!char.dialog) {
            return
        }
        const code = char.dialog[menu]
        return <PopupCodeEditor game={game} ui={CODE_EDITOR_UI_NAMESELECTOR} code={code || ""} onSaveClose={(s) => editCode(menu, s)} open={codeEditorOpen}></PopupCodeEditor>
    }

    const editCode = (menu: CodeEditMenu, val: string) => {
        if (!char.dialog) {
            return
        }
        const upd = val.trim() === "" ? undefined : val;
        setChar({ ...char, dialog: {...char.dialog, [menu]: upd }})
        setCodeEditorOpen(false)
    }

    const renderCodeEditButton = (prop: CodeEditMenu, name?: string) => {
        if (!char.dialog) {
            return
        }
        const displayName = name || prop
        const codeEdit = (menu: CodeEditMenu) => {
            setCodeEditMenu(menu)
            setCodeEditorOpen(true)
        }
        return <CodeSampleButton onClick={() => codeEdit(prop)} name={displayName} code={char.dialog[prop]} />
    }

    const mustBeDialog = char.dialog || createCharacterDialog()

    const setDialog = (val?: CharacterDialog) => {
        console.log("Setting dialog: " + JSON.stringify(val))
        setChar({ ...char, dialog: val })
    }

    const linksChange = (val: DialogLink[]) => setDialog({ ...mustBeDialog, links: val })
    const textChange = (val: TextList) => setDialog({ ...mustBeDialog, text: val })

    return (
        <Drawer size="full" placement="bottom" open={open} onClose={() => onCloseHandler(true)}>
            <Drawer.Header>
                <Drawer.Title>Dialog options for {char.displayName.main}</Drawer.Title>
                <Drawer.Actions>
                    {char.dialog === undefined ? null : <ConfirmDeleteButtonSmall customText='Disable dialog' onConfirm={() => setDialog(undefined)} />}
                    <Button onClick={() => onCloseHandler(false)} appearance="ghost" color="blue">
                        Discard
                    </Button>
                    <Button onClick={() => onCloseHandler(true)} appearance="primary">
                        Save
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body className="window-editor-drawer-body">
                <Checkbox checked={char.dialog !== undefined} readOnly={char.dialog !== undefined} onChange={() => setDialog(mustBeDialog)}>Dialog enabled</Checkbox>
                {char.dialog === undefined ? <p>Enable dialog option to edit character</p> :
                    <Grid className="window-editor-grid">
                        <Row className="show-grid">
                            <Col xs={6}>
                                <div className='char-params'>
                                    <p>Char UID</p>
                                    <Input value={char.uid} readOnly></Input>
                                    <Divider>Events</Divider>
                                    <p>Event hosts editor goes <i>right</i> here</p>
                                    {char.dialog?.eventHosts && renderCodeEditButton("canHostEventsScript")}
                                    <Divider>Behavior</Divider>
                                    {char.dialog !== undefined && <BehaviorEditor handlers={handlers} game={game} value={char.dialog.behavior} onSetBehavior=   {(value) => setDialog({...mustBeDialog, behavior: value})}/>}
                                </div>
                            </Col>
                            <Col xs={12}>
                                <div className='char-params'>
                                    <PanelGroup accordion bordered>
                                        <Panel header="Display text" defaultExpanded>
                                            <TextListEditor textList={mustBeDialog.text} onChange={textChange}></TextListEditor>
                                        </Panel>
                                        <Panel header="Background">
                                            <ImageListEditor imageList={mustBeDialog.background} onChange={(val) => setDialog({ ...mustBeDialog, background: val })} />
                                        </Panel>
                                        <Panel header="Scripting">
                                            {renderCodeEditButton("chooseTextScript")}
                                            {renderCodeEditButton("chooseBgScript")}
                                        </Panel>
                                    </PanelGroup>
                                    {renderCodeEditor(codeEditMenu)}
                                </div>
                            </Col>
                            <Col xs={6}>
                                <div className='link-editor'>
                                    <p>Links</p>
                                    <LinksEditorPanel links={mustBeDialog.links} dialog={null} handlers={handlers} game={game} onChange={linksChange} window={null} window_uid={char.uid}></LinksEditorPanel>
                                </div>
                            </Col>
                        </Row>
                    </Grid>
                }


            </Drawer.Body>
        </Drawer>
    );
};

export default CharDialogEditorDrawer;

