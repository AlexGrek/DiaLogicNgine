import React, { useEffect, useState } from 'react';
import { Button, CheckPicker, Checkbox, Col, Divider, Drawer, Grid, Input, Panel, PanelGroup, Row, Slider } from 'rsuite';
import GameEvent, { createEvent } from '../../../game/Events';
import { GameDescription } from '../../../game/GameDescription';
import CodeSampleButton from '../../common/CodeSampleButton';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';
import DialogWindowPicker from '../../common/DialogWindowPicker';
import { DialogWindowId } from '../../../exec/GameState';

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

interface EventEditorDrawerProps {
    event: GameEvent | null;
    onEventChange: (ev: GameEvent) => void
    onClose: () => void
    onDelete: () => void
    hosts: (string | null)[]
    game: GameDescription
}

type CodeEditMenu = "onEventActionScript" | "canHappenScript"

const EventEditorDrawer: React.FC<EventEditorDrawerProps> = ({ event, onClose, onEventChange, onDelete, hosts, game }) => {
    const [ev, setEv] = useState<GameEvent>(event || createEvent());
    // enable code editor props
    const [codeEditMenu, setCodeEditMenu] = useState<CodeEditMenu>("canHappenScript");
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false);

    useEffect(() => {
        setEv(event || createEvent());
    }, [event]);

    const onCloseHandler = (save: boolean) => {
        if (save && event !== null) {
            onEventChange(ev)
        }
        onClose()
    }

    const preparedHosts = hosts.map((host) => {
        return { label: host || "null", value: host || "null" }
    })

    // embedded code editor

    const editCode = (menu: CodeEditMenu, val: string) => {
        const upd = val.trim() === "" ? undefined : val;
        setEv({ ...ev, [menu]: upd })
        setCodeEditorOpen(false)
    }

    const renderCodeEditButton = (prop: CodeEditMenu, name?: string) => {
        const displayName = name || prop
        const codeEdit = (menu: CodeEditMenu) => {
            setCodeEditMenu(menu)
            setCodeEditorOpen(true)
        }
        return <CodeSampleButton onClick={() => codeEdit(prop)} name={displayName} code={ev[prop]} />
    }

    const renderCodeEditor = (menu: CodeEditMenu) => {
        const code = ev[menu]
        return <PopupCodeEditor game={game} ui={CODE_EDITOR_UI_NAMESELECTOR} code={code || ""} onSaveClose={(s) => editCode(menu, s)} open={codeEditorOpen}></PopupCodeEditor>
    }

    const onSetDialogWindow = (d: string | null, w: string | null) => {
        if (d === null || w === null) {
            setEv({...ev, link: null})
        } else {
            const id: DialogWindowId = {
                kind: "window",
                dialog: d,
                window: w
            }
            setEv({...ev, link: id})
        }
    }

    return (
        <Drawer size="full" placement="bottom" open={event !== null} onClose={() => onCloseHandler(true)}>
            <Drawer.Header>
                <Drawer.Title>Edit event {ev.name}</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => onDelete()} appearance="ghost" color='red'>
                        Delete
                    </Button>
                    <Button onClick={() => onCloseHandler(false)} appearance="ghost" color="blue">
                        Discard
                    </Button>
                    <Button disabled={ev.name === ""} onClick={() => onCloseHandler(true)} appearance="primary">
                        Save
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body className="window-editor-drawer-body">

                <Grid className="window-editor-grid">
                    <Row className="show-grid">
                        <Col xs={6}>
                            <div className='location-params'>
                                <p>Event name</p>
                                <Input value={ev.name} onChange={(value) => setEv({ ...ev, name: value })}></Input>
                                <Divider>Hosts</Divider>
                                <CheckPicker value={ev.targets} onChange={(upd) => setEv({ ...ev, targets: upd })} label="Target hosts" data={preparedHosts}></CheckPicker>
                            </div>
                        </Col>
                        <Col xs={12}>
                            <div className='location-params'>
                                <PanelGroup accordion bordered>
                                    <Panel header="Probalility" defaultExpanded>
                                    <Checkbox checked={ev.highPriority} onChange={(value, checked) => setEv({...ev, highPriority: checked})}>High priority</Checkbox>
                                    <p>
                                        <span>{ev.probability}%</span>
                                        <Slider
      progress
      value={ev.probability}
      onChange={value => {
        setEv({...ev, probability: value})
      }}
    />
                                    </p>
                                    </Panel>
                                    <Panel defaultExpanded header="Scripting">
                                        {renderCodeEditButton("onEventActionScript")}
                                        {renderCodeEditButton("canHappenScript")}
                                    </Panel>
                                </PanelGroup>
                                {renderCodeEditor(codeEditMenu)}
                            </div>
                        </Col>
                        <Col xs={6}>
                            <p>Destination</p>
                            <Checkbox checked={ev.link !== null} onChange={(value, checked) => checked ? onSetDialogWindow(game.startupDialog.dialog, game.startupDialog.window) : setEv({...ev, link: null})}>Push to another window</Checkbox>
                            {ev.link && <DialogWindowPicker dialogs={game.dialogs} chosen={[ev.link.dialog, ev.link.window]} onValueChange={onSetDialogWindow}/>}
                        </Col>
                    </Row>
                </Grid>



            </Drawer.Body>
        </Drawer>
    );
};

export default EventEditorDrawer;
