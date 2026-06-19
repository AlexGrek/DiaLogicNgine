import React, { useState, useEffect } from 'react';
import { createDialogWindowId } from '../../../exec/GameState';
import { GameDescription, GeneralGameInfo, createDefaultDevConfig } from '../../../game/GameDescription';
import DialogWindowPicker from '../../common/DialogWindowPicker';
import { Button, ButtonGroup, Input, Panel, Stack } from 'rsuite';
import ImagePicker from '../../common/ImagePicker';
import lodash from 'lodash';
import './configuration.css'
import GeneralEditor from './GeneralEditor';
import { IUpds } from '../../../App';
import StringMapEditor from '../../common/StringMapEditor';
import StringListEditor from '../../common/StringListEditor';
import PillLikeTabs, { PillTab } from '../../common/PillLikeTabs';
import SanityCheckPanel from './SanityCheckPanel';

interface ConfigurationMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds
}

const ConfigurationMenu: React.FC<ConfigurationMenuProps> = ({ game, onSetGame, handlers }) => {
    const [currentGame, setCurrentGame] = useState<GameDescription>(game);
    const [generalEditorOpen, setGeneralEditorOpen] = useState<boolean>(false);

    useEffect(() => {
        setCurrentGame(game);
    }, [game]);

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

    const renderGeneralProp = (name: keyof GeneralGameInfo) => {
        const prop = game.general[name]
        return <p id={`general-prop-${name}`}>
            <b>{name}: </b>{prop.toString()}
        </p>
    }

    const aboutTab = (
        <div className="config-tab-panel">
            <Panel bordered header={
                <Stack justifyContent="space-between">
                    <span>About game</span>
                    <ButtonGroup>
                        <Button active onClick={() => setGeneralEditorOpen(true)}>Edit</Button>
                    </ButtonGroup>
                </Stack>
            }>
                {renderGeneralProp("name")}
                {renderGeneralProp("version")}
                {renderGeneralProp("description")}
                {renderGeneralProp("authors")}
                <GeneralEditor value={game.general} open={generalEditorOpen} onChange={val => onSetGame({ ...currentGame, general: val })} onClose={() => setGeneralEditorOpen(false)} />
            </Panel>
        </div>
    );

    const basicTab = (
        <div className="config-tab-panel">
            <Panel bordered header="Startup dialog">
                <DialogWindowPicker handlers={handlers} dialogs={currentGame.dialogs} chosen={[currentGame.startupDialog.dialog, currentGame.startupDialog.window]} onValueChange={onCurrentDialogChange}></DialogWindowPicker>
            </Panel>
        </div>
    );

    const situationsTab = (
        <div className="config-tab-panel">
            <Panel bordered header="Situations">
                <StringListEditor canBeEmpty value={currentGame.situations} onChange={(val) => onSetGame({ ...currentGame, situations: val })} />
            </Panel>
        </div>
    );

    const menuBgTab = (
        <div className="config-tab-panel">
            <Panel bordered header="Menu background">
                <ImagePicker value={game.startMenu.menuBackground} onChange={(val) => onStartupBgChange(val || undefined)} />
            </Panel>
        </div>
    );

    const localizationTab = (
        <div className="config-tab-panel">
            <Panel bordered header="Localization">
                <StringMapEditor onChange={(transl) => onSetGame({ ...game, translations: transl })} value={game.translations} />
            </Panel>
        </div>
    );

    const devTab = (
        <div className="config-tab-panel">
            <Panel bordered header="Developer / AI">
                <p style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
                    Basic prompt suffix — appended to quick AI prompts across the editor.
                </p>
                <Input
                    as="textarea"
                    rows={3}
                    value={game.dev?.basicPromptSuffix ?? ''}
                    onChange={(val) => onSetGame({ ...game, dev: { ...(game.dev ?? createDefaultDevConfig()), basicPromptSuffix: val } })}
                    placeholder="e.g. fantasy RPG style, pixel art, vibrant colors"
                />
            </Panel>
        </div>
    );

    const tabs: PillTab[] = [
        { header: 'About', content: aboutTab },
        { header: 'Basic', content: basicTab },
        { header: 'Situations', content: situationsTab },
        { header: 'Menu background', content: menuBgTab },
        { header: 'Localization', content: localizationTab },
        { header: 'Developer / AI', content: devTab },
        { header: 'Sanity check', content: <SanityCheckPanel game={game} /> },
    ];

    return (
        <div className="saveload-page" style={{ padding: '0 8px' }}>
            <h2 className="center-header">Game configuration</h2>
            <PillLikeTabs tabs={tabs} />
        </div>
    );
};

export default ConfigurationMenu;
