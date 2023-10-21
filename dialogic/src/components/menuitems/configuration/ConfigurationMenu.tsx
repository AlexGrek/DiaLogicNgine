import React, { useState, useEffect } from 'react';
import { createDialogWindowId } from '../../../exec/GameState';
import { GameDescription } from '../../../game/GameDescription';
import { NotifyCallback } from '../../../UiNotifications';
import DialogWindowPicker from '../../common/DialogWindowPicker';
import { Panel, PanelGroup } from 'rsuite';
import ImageListEditor from '../../common/text_list/ImageListEditor';
import PublicFileUrl, { IMAGES } from '../../common/PublicFileUrl';
import { generateImageUrl } from '../../../Utils';
import lodash from 'lodash';
import './configuration.css'

interface ConfigurationMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    onNotify: NotifyCallback;
}

const ConfigurationMenu: React.FC<ConfigurationMenuProps> = ({ game, onSetGame, onNotify }) => {
    const [currentGame, setCurrentGame] = useState<GameDescription>(game);
    useEffect(() => {
        setCurrentGame(game);
    }, [game]);

    const onCurrentDialogChange = (d: string | null, w: string | null) => {
        if (d && w) {
            const gameUpdate = {...currentGame, startupDialog: createDialogWindowId(d, w)}
            onSetGame(gameUpdate)
        }
    }

    const onStartupBgChange = (value: string | undefined) => {
        const changes = lodash.cloneDeep(currentGame.startMenu)
        changes.menuBackground = value
        onSetGame({...game, startMenu: changes})
    }

    const publicImageSrc = game.startMenu.menuBackground ? generateImageUrl(game.startMenu.menuBackground) : null;

    return (
        <div>
            <h2>Game configuration menu</h2>
            <PanelGroup accordion bordered>
                <Panel header="Basic">
                <p>Startup dialog</p>
                <DialogWindowPicker dialogs={currentGame.dialogs} chosen={[currentGame.startupDialog.dialog, currentGame.startupDialog.window]} onValueChange={onCurrentDialogChange}></DialogWindowPicker>
                </Panel>
                <Panel header="Menu background">
                <img className='menu-config-thumb-preview' src={publicImageSrc || undefined} alt="[no thumbnail]"></img>
                                <PublicFileUrl extensions={IMAGES} value={game.startMenu.menuBackground} onChange={(val) => onStartupBgChange(val)}></PublicFileUrl>
                </Panel>
            </PanelGroup>
        </div>
    );
};

export default ConfigurationMenu;
