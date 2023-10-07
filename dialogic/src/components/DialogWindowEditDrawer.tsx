import React, { useState, useEffect, useRef } from 'react';
import { Button, Drawer, Input, Grid, Row, Col, Checkbox, Stack, PanelGroup, Panel } from 'rsuite';
import { IUpds } from '../App';
import Dialog, { Actor, DialogLink, DialogWindow } from '../game/Dialog';
import { GameDescription } from '../game/GameDescription';
import { DialogHandlers } from './DialogEditor';
import LinksEditorPanel from './LinksEditorPanel';
import PublicFileUrl, { IMAGES } from './common/PublicFileUrl';
import TextListEditor from './common/text_list/TextListEditor';
import { TextList } from '../game/TextList';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from './common/code_editor/PopupCodeEditor';
import CodeSampleButton from './common/CodeSampleButton';
import { ImageList } from '../game/ImageList';
import ImageListEditor from './common/text_list/ImageListEditor';
import ActorEditor from './common/actor/ActorEditor';

const CODE_EDITOR_UI_TEXTSELECTOR: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    "functionName": "chooseAltText",
    "functionTemplates": {
        "no action": "",
        "always main": "return 0;",
        "always first alternative": "return 1;"
    },
    "header": "alternative text choose"
  }


  type CodeEditMenu = "chooseText" | "chooseBackground" | "onEntry"

interface DialogWindowEditDrawerProps {
    window: DialogWindow;
    dialog: Dialog;
    open: boolean;
    handlers: IUpds;
    onClose: Function;
    game: GameDescription;
    dialogHandlers: DialogHandlers;
}

const DialogWindowEditDrawer: React.FC<DialogWindowEditDrawerProps> = ({ window, dialog, open,
    handlers, onClose, game, dialogHandlers }) => {
    const [windowState, setWindow] = useState<DialogWindow>(window);
    const [changesMade, setChanges] = useState<boolean>(false);
    const [codeEditMenu, setCodeEditMenu] = useState<CodeEditMenu>("chooseText");
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false);

    useEffect(() => {
        setWindow(window);
        setChanges(false);
    }, [window]);

    const codeEdit = (menu: CodeEditMenu) => {
        setCodeEditMenu(menu)
        setCodeEditorOpen(true)
    }

    const editCode = (menu: CodeEditMenu, val: string) => {
        const upd = val === "" ? undefined : val;
        switch (menu) {
            case "chooseText":
                const updater = (window: DialogWindow) => { return { ...window, chooseTextScript: upd } };
                modifyWindowBy(updater);
                break;
            case "chooseBackground":
                const updaterBg = (window: DialogWindow) => { return { ...window, chooseBackgroundScript: upd } };
                modifyWindowBy(updaterBg);
                break;
            case "onEntry":
                const updaterOnEntr = (window: DialogWindow) => { return { ...window, entryScript: upd } };
                modifyWindowBy(updaterOnEntr);
                break;
        }
        
        setCodeEditorOpen(false);
      }

      const renderCodeEditor = (menu: CodeEditMenu) => {
        var code: string | undefined = ""
        var onSaveClose = editCode
        var ui = CODE_EDITOR_UI_TEXTSELECTOR
        switch (menu) {
            case "chooseText":
                code = windowState.chooseTextScript
                ui = CODE_EDITOR_UI_TEXTSELECTOR
                break;
            case "chooseBackground":
                code = windowState.chooseBackgroundScript
                ui = CODE_EDITOR_UI_TEXTSELECTOR
                break;
            case "onEntry":
                code = windowState.entryScript
                ui = CODE_EDITOR_UI_TEXTSELECTOR
                break;
        }
        return <PopupCodeEditor ui={ui} code={code || ""} game={game} onSaveClose={(s) => onSaveClose(menu, s)} open={codeEditorOpen}></PopupCodeEditor>
    }

    const modifyWindowBy = (modificator: (input: DialogWindow) => DialogWindow) => {
        setChanges(true);
        // console.log("window changed");
        const newWindow = modificator(windowState);
        console.log(JSON.stringify(newWindow));
        setWindow(newWindow); // update window changes
    }

    const onLinkChange = (links: DialogLink[]) => {
        const updater = (window: DialogWindow) => { return { ...window, links: links } };
        modifyWindowBy(updater)
    }

    const onTextChange = (s: TextList) => {
        setChanges(true);
        setWindow({ ...windowState, text: s });
    }

    const onCloseHandler = (a: boolean) => {
        handlers.handleDialogWindowChange(windowState, null);
        onClose();
    }

    const onBackgroundChange = (val: ImageList) => {
        return modifyWindowBy(window => {
            return { ...window, backgrounds: val }
        })
    }

    return (
        <Drawer size="full" placement="bottom" open={open} onClose={() => onCloseHandler(false)}>
            <Drawer.Header>
                <Drawer.Title>{windowState.uid}</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => onCloseHandler(false)} appearance="primary">
                        Save
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body className="window-editor-drawer-body">
                <Grid className="window-editor-grid">
                    <Row className="show-grid">
                        <Col xs={6}>
                            <div className='window-editor-grid-header'>
                                Related
                            </div>
                            <PanelGroup accordion bordered>
                                <Panel header="Actor" defaultExpanded>
                                    <ActorEditor value={windowState.actor} game={game} onChange={(actor) => setWindow({...windowState, actor: actor})}/>
                                </Panel>
                                <Panel header="Technical info">
                                <p>Display as JSON:</p>
                            <Input as='textarea' rows={6} readOnly value={JSON.stringify(windowState)}></Input>
                            <Checkbox checked={changesMade}>changes</Checkbox>
                                </Panel>
                            </PanelGroup>
                            
                        </Col>
                        <Col xs={12} className="window-editor-grid-content">
                            <div className='window-editor-grid-header'>
                                Content
                            </div>
                            <PanelGroup accordion bordered>
                                <Panel header="Text" defaultExpanded>
                                <TextListEditor textList={windowState.text} onChange={onTextChange}></TextListEditor>
                                </Panel>
                                <Panel header="Background image">
                                <ImageListEditor imageList={windowState.backgrounds} onChange={onBackgroundChange}/>
                                </Panel>
                                <Panel header="Scripting">
                                <div className='window-editor-code-editors-stack'>
                                <CodeSampleButton onClick={() => codeEdit("chooseText")} name='chooseText' code={windowState.chooseTextScript}/>
                                <CodeSampleButton onClick={() => codeEdit("chooseBackground")} name='chooseBackground' code={windowState.chooseBackgroundScript}/>
                                <CodeSampleButton onClick={() => codeEdit("onEntry")} name='onEntry' code={windowState.entryScript}/>
                            </div>
                                </Panel>
                            </PanelGroup>
                            
                            
                            
                            
                        </Col>
                        <Col xs={6}>
                            <div className='window-editor-grid-header'>
                                Links
                            </div>
                            <LinksEditorPanel window_uid={window.uid} dialogHandlers={dialogHandlers} onChange={onLinkChange} links={windowState.links} dialog={dialog} game={game} handlers={handlers} window={windowState}></LinksEditorPanel>
                        </Col>
                    </Row>
                </Grid>
                {renderCodeEditor(codeEditMenu)}
            </Drawer.Body>
        </Drawer>
    );
};

export default DialogWindowEditDrawer;
