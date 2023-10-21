import React, { useState, useEffect } from 'react';
import Loc from '../../../game/Loc';
import { Button, CheckPicker, Col, Divider, Drawer, Grid, IconButton, Input, Panel, PanelGroup, Row } from 'rsuite';
import PublicFileUrl, { IMAGES } from '../../common/PublicFileUrl';
import LinksEditorPanel from '../../LinksEditorPanel';
import { DialogLink, DialogWindow } from '../../../game/Dialog';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import TextListEditor from '../../common/text_list/TextListEditor';
import { TextList } from '../../../game/TextList';
import { generateImageUrl, isValidJsIdentifier } from '../../../Utils';
import VerifyRoundIcon from '@rsuite/icons/VerifyRound';
import './loc.css'
import lodash from 'lodash';
import ImageListEditor from '../../common/text_list/ImageListEditor';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';
import CodeSampleButton from '../../common/CodeSampleButton';

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

interface LocEditorProps {
    loc: Loc;
    open: boolean;
    onUpdateLocation: (updates: Loc) => void;
    onClose: () => void;
    game: GameDescription
    handlers: IUpds;
}

type CodeEditMenu = "isAccessibleScript" | "isVisibleScript" | "chooseTextScript" | "choosebackgroundScript" | "onEntryScript"

const LocEditor: React.FC<LocEditorProps> = ({ loc, onUpdateLocation, onClose, open, handlers, game }) => {
    const [location, setlocation] = useState<Loc>(loc);
    const [checkedNewRoutes, setCheckedNewRoutes] = useState<string[]>([])
    // enable code editor props
    const [codeEditMenu, setCodeEditMenu] = useState<CodeEditMenu>("onEntryScript");
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false);

    useEffect(() => {
        setlocation(loc);
    }, [loc]);

    const onCloseHandler = (save: boolean) => {
        if (save) {
            onUpdateLocation(location)
        }
        onClose()
    }

    const onDelete = () => {
        setlocation({ ...location, uid: "" })
        onUpdateLocation({ ...location, uid: "" })
        onClose()
    }

    const findAvailableRoutesFor = (uid: string) => {
        const allLocsExceptThis = game.locs.filter(loc => loc.uid != uid)
        return allLocsExceptThis
            .filter(item => {
                return !location.routes.includes(item.uid)
            })
            .map((loc) => {
                return {
                    label: loc.displayName,
                    value: loc.uid
                }
            })
    }

    const addRouteFromTo = (from: string, to: string) => {
        console.log(`Trying to connect locs: ${from} -> ${to}`)

        const locations = lodash.cloneDeep(game.locs)
        let thisLocIndex = locations.findIndex((loc) => loc.uid === location.uid)
        if (thisLocIndex < 0) {
            locations.push(location)
            thisLocIndex = locations.length - 1
        }
        else {
            locations[thisLocIndex] = location
        }

        const locFromIndex = locations.findIndex((loc) => loc.uid === from)
        if (locFromIndex < 0) {
            console.error(`Location ${from} not found`)
            return
        }

        locations[locFromIndex].routes.push(to)
        handlers.handleLocChange(locations)
    }

    const makeRoutes = () => {
        const routes = lodash.cloneDeep(location.routes)
        checkedNewRoutes.forEach((item => {
            routes.push(item)
        }))
        setCheckedNewRoutes([])
        setlocation({ ...location, routes: routes })
    }

    const deleteRoute = (del: string) => {
        const routes = lodash.cloneDeep(location.routes)
        setCheckedNewRoutes([])
        setlocation({ ...location, routes: routes.filter(el => el !== del) })
    }

    const renderRoutes = () => {
        return location.routes.map((route, i) => {
            const loc = game.locs.find(loc => loc.uid === route)
            const bidirectional = loc?.routes.includes(location.uid)
            if (!loc) {
                console.warn(`Location ${route} was not found, but has a route from ${location.uid}`)
                deleteRoute(route)
                return <Divider key={i}/>
            }
            return <div className='loc-route' key={i}>
                <p>{loc.displayName}</p>
                {bidirectional ? <VerifyRoundIcon color='green' style={{ fontSize: '3em' }} /> : <IconButton color='green' icon={<VerifyRoundIcon />} onClick={() => { addRouteFromTo(route, location.uid) }}></IconButton>}
                <Button color='red' appearance="link" onClick={() => deleteRoute(route)}>Remove</Button>
            </div>
        })
    }

    const renderCodeEditor = (menu: CodeEditMenu) => {
        const code = location[menu]
        return <PopupCodeEditor game={game} ui={CODE_EDITOR_UI_NAMESELECTOR} code={code || ""} onSaveClose={(s) => editCode(menu, s)} open={codeEditorOpen}></PopupCodeEditor>
    }

    const editCode = (menu: CodeEditMenu, val: string) => {
        const upd = val.trim() === "" ? undefined : val;
        setlocation({ ...location, [menu]: upd })
        setCodeEditorOpen(false)
    }

    const renderCodeEditButton = (prop: CodeEditMenu, name?: string) => {
        const displayName = name || prop
        const codeEdit = (menu: CodeEditMenu) => {
            setCodeEditMenu(menu)
            setCodeEditorOpen(true)
        }
        return <CodeSampleButton onClick={() => codeEdit(prop)} name={displayName} code={location[prop]} />
    }

    const displayNameChange = (val: string) => setlocation({ ...location, displayName: val })
    const uidNameChange = (val: string) => setlocation({ ...location, uid: val })
    const thumbChange = (val?: string) => setlocation({ ...location, thumbnail: val })
    const linksChange = (val: DialogLink[]) => setlocation({ ...location, links: val })
    const textChange = (val: TextList) => setlocation({ ...location, text: val })

    const publicImageSrc = location.thumbnail ? generateImageUrl(location.thumbnail) : null;

    return (
        <Drawer size="full" placement="bottom" open={open} onClose={() => onCloseHandler(true)}>
            <Drawer.Header>
                <Drawer.Title>{loc.uid}</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => onDelete()} appearance="ghost" color='red'>
                        Delete
                    </Button>
                    <Button onClick={() => onCloseHandler(false)} appearance="ghost" color="blue">
                        Discard
                    </Button>
                    <Button disabled={location.uid === "" || !isValidJsIdentifier(location.uid)} onClick={() => onCloseHandler(true)} appearance="primary">
                        Save
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body className="window-editor-drawer-body">

                <Grid className="window-editor-grid">
                    <Row className="show-grid">
                        <Col xs={6}>
                            <div className='location-params'>
                                <p>UID (has to be unique)</p>
                                <Input value={location.uid} readOnly={loc.uid !== ""} onChange={uidNameChange}></Input>
                                <p>Thumbnail image</p>
                                <img className='location-thumb-preview' src={publicImageSrc || undefined} alt="[no thumbnail]"></img>
                                <PublicFileUrl extensions={IMAGES} value={location.thumbnail} onChange={thumbChange}></PublicFileUrl>
                                <Divider>Routes</Divider>
                                <CheckPicker value={checkedNewRoutes} onChange={setCheckedNewRoutes} label="Add" data={findAvailableRoutesFor(location.uid)}></CheckPicker>
                                <Button onClick={() => makeRoutes()} disabled={checkedNewRoutes.length < 1 || loc.uid === ""}>Make routes</Button>
                                {renderRoutes()}
                            </div>
                        </Col>
                        <Col xs={12}>
                            <div className='location-params'>
                                <p>Display name</p>
                                <Input value={location.displayName} onChange={displayNameChange}></Input>
                                <PanelGroup accordion bordered>
                                    <Panel header="Display text" defaultExpanded>
                                        <TextListEditor textList={location.text} onChange={textChange}></TextListEditor>
                                    </Panel>

                                    <Panel header="Background">
                                        <ImageListEditor imageList={location.backgrounds} onChange={(val) => setlocation({ ...location, backgrounds: val })} />
                                    </Panel>
                                    <Panel header="Scripting">
                                        {renderCodeEditButton("isAccessibleScript")}
                                        {renderCodeEditButton("isVisibleScript")}
                                        {renderCodeEditButton("chooseTextScript")}
                                        {renderCodeEditButton("choosebackgroundScript")}
                                        {renderCodeEditButton("onEntryScript")}
                                    </Panel>
                                </PanelGroup>
                                {renderCodeEditor(codeEditMenu)}
                            </div>
                        </Col>
                        <Col xs={6}>
                            <div className='link-editor'>
                                <p>Links</p>
                                <LinksEditorPanel links={location.links} dialog={null} handlers={handlers} game={game} onChange={linksChange} window={null} window_uid={loc.uid}></LinksEditorPanel>
                            </div>
                        </Col>
                    </Row>
                </Grid>



            </Drawer.Body>
        </Drawer>
    );
};

export default LocEditor;
