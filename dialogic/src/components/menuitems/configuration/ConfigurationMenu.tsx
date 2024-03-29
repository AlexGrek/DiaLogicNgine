import React, { useState, useEffect } from 'react';
import { createDialogWindowId } from '../../../exec/GameState';
import { GameDescription, GeneralGameInfo } from '../../../game/GameDescription';
import { NotifyCallback } from '../../../UiNotifications';
import DialogWindowPicker from '../../common/DialogWindowPicker';
import { Button, ButtonGroup, Panel, PanelGroup, Stack } from 'rsuite';
import ImageListEditor from '../../common/text_list/ImageListEditor';
import PublicFileUrl, { IMAGES } from '../../common/PublicFileUrl';
import { generateImageUrl } from '../../../Utils';
import lodash from 'lodash';
import './configuration.css'
import GeneralEditor from './GeneralEditor';
import { IUpds } from '../../../App';
import Note from '../../userguide/Note';
import StringMapEditor from '../../common/StringMapEditor';
import { Translations } from '../../../exec/Localization';
import StringListEditor from '../../common/StringListEditor';

interface ConfigurationMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds
    visible: boolean
}

const ConfigurationMenu: React.FC<ConfigurationMenuProps> = ({ game, onSetGame, handlers, visible }) => {
    const [currentGame, setCurrentGame] = useState<GameDescription>(game);
    const [generalEditorOpen, setGeneralEditorOpen] = useState<boolean>(false);

    useEffect(() => {
        setCurrentGame(game);
    }, [game]);

    if (!visible) {
        return <div />
    }

    const onCurrentDialogChange = (d: string | null, w: string | null) => {
        if (d && w) {
            const gameUpdate = { ...currentGame, startupDialog: createDialogWindowId(d, w) }
            onSetGame(gameUpdate)
        }
    }

    const onStartupBgChange = (value: string | undefined) => {
        const changes = lodash.cloneDeep(currentGame.startMenu)
        changes.menuBackground = value
        onSetGame({ ...game, startMenu: changes })
    }

    const publicImageSrc = game.startMenu.menuBackground ? generateImageUrl(game.startMenu.menuBackground) : null;

    const renderGeneralProp = (name: keyof GeneralGameInfo) => {
        const prop = game.general[name]
        return <p id={`general-prop-${name}`}>
            <b>{name}: </b>{prop.toString()}
        </p>
    }

    return (
        <div>
            <h3 className='center-header'>Game configuration menu</h3>
            <Note warning text={"**Under construction.** \n\nThis component is under heavy development, design will be changed"} />
            <Stack wrap={true} alignItems='stretch'>
                <Panel style={{ minWidth: '30em', maxWidth: '40em' }}
                    bordered
                    header={
                        <Stack justifyContent="space-between">
                            <span>About game</span>
                            <ButtonGroup>
                                <Button active onClick={() => setGeneralEditorOpen(true)}>Edit</Button>
                            </ButtonGroup>
                        </Stack>
                    }
                >
                    {renderGeneralProp("name")}
                    {renderGeneralProp("version")}
                    {renderGeneralProp("description")}
                    {renderGeneralProp("authors")}
                    <GeneralEditor value={game.general} open={generalEditorOpen} onChange={val => onSetGame({ ...currentGame, general: val })} onClose={() => setGeneralEditorOpen(false)} />
                </Panel>
                <PanelGroup accordion bordered style={{ minWidth: '40em' }}>
                    <Panel header="Basic">
                        <p>Startup dialog</p>
                        <DialogWindowPicker handlers={handlers} dialogs={currentGame.dialogs} chosen={[currentGame.startupDialog.dialog, currentGame.startupDialog.window]} onValueChange={onCurrentDialogChange}></DialogWindowPicker>
                    </Panel>
                    <Panel header="Situations">
                        <StringListEditor canBeEmpty value={currentGame.situations} onChange={(val) => onSetGame({ ...currentGame, situations: val })} />
                    </Panel>
                    <Panel header="Menu background">
                        <img className='menu-config-thumb-preview' src={publicImageSrc || undefined} alt="[no image]"></img>
                        <PublicFileUrl extensions={IMAGES} value={game.startMenu.menuBackground} onChange={(val) => onStartupBgChange(val || undefined)}></PublicFileUrl>
                    </Panel>
                    <Panel header='Localization'>
                        <div>
                            <StringMapEditor onChange={(transl) => onSetGame({ ...game, translations: transl })} value={game.translations} />
                        </div>
                    </Panel>
                </PanelGroup>
            </Stack>
        </div>
    );
};

export default ConfigurationMenu;
