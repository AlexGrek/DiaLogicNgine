import React, { useEffect, useRef, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import LeftTabUiMenuWidget, { DataGroups } from './LeftTabUiMenuWidget';
import { State } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import TabsUiMenuWidget from './TabsUiMenuWidget';
import { trace } from '../../Trace';
import { groupByProperty } from '../../Utils';
import { QuestRenderView, TaskRenderView } from '../../exec/RenderView';
import Markdown from 'react-markdown';
import './MenuTab.css'
import { ObjectiveStatus } from '../../exec/QuestProcessor';
import SavesManager from '../../savegame/LocalStorageSavesManager';

interface MenuTabProps {
    gameExecutor: GameExecManager
    state: State
    localmanager: LocalizationManager
    onStateChange: (newState: State) => void
}

type OpenMenu = "load" | "save" | "about" | null

const MenuTab: React.FC<MenuTabProps> = ({ gameExecutor, state, localmanager, onStateChange }) => {
    const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
    const manager = useRef<SavesManager>(new SavesManager(gameExecutor.game.general.name))
    const [newSaveName, setNewSaveName] = useState<string>("")

    useEffect(() => {
        setOpenMenu(null)
        manager.current = new SavesManager(gameExecutor.game.general.name)
    }, [gameExecutor.game])

    const renderLoadMenuDetails = () => {
        return <div>
            {manager.current.listAllSaves().map((savegame) => {
                return <div className='savegame-container'>
                    <p className='savegame-name'>{savegame.name}</p>
                    <p className='savegame-date'>{savegame.created.toDateString()}</p>
                    <p className='savegame-attributes'>{savegame.isAutosave ? "auto" : ""}{savegame.isQuicksave ? "quick" : ""}</p>
                    <button onClick={() => onStateChange(savegame.state)}>Load</button>
                </div>
            })}
        </div>
    }

    const renderSaveMenuDetails = () => {
        return <div>
            <p>{localmanager.local("Create new save")}</p>
            <input value={newSaveName} onChange={(ev) => setNewSaveName(ev.target.value)}></input>
            <button name='save'>{localmanager.local("Save")}</button>
        </div>
    }

    const renderAboutMenuDetails = () => {
        return <div>
            <h3>{localmanager.local("About")}</h3>
            <p>{gameExecutor.game.general.name} <code>{gameExecutor.game.general.version}</code></p>
            <p>{gameExecutor.game.general.description}</p>
            <p>{gameExecutor.game.general.authors}</p>
        </div>
    }

    const renderMenuDetails = () => {
        switch (openMenu) {
            case "load":
                return renderLoadMenuDetails()
            case "save":
                return renderSaveMenuDetails()
            case "about":
                return renderAboutMenuDetails()
            default:
                return <div></div>
        }
    }

    const genClassNameForButton = (open: OpenMenu) => {
        if (openMenu == open) {
            return "open"
        }
        else return ""
    }

    const renderMenuMenu = () => {
        return <div className='game-menu-tab-menu'>
            <button className={genClassNameForButton(null)} onClick={() => alert("not implemented yet")}>{localmanager.local("New game")}</button>
            <button className={genClassNameForButton("save")} onClick={() => setOpenMenu("save")}>{localmanager.local("Save")}</button>
            <button className={genClassNameForButton("load")} onClick={() => setOpenMenu("load")}>{localmanager.local("Load")}</button>
            <button className={genClassNameForButton("about")} onClick={() => setOpenMenu("about")}>{localmanager.local("About")}</button>
        </div>
    }

    return (
        <div className='game-menu-tab-container'>
            <div className='game-menu-tab-menuitems'>
                {renderMenuMenu()}
            </div>
            <div className='game-menu-tab-details'>
                {renderMenuDetails()}
            </div>
        </div>
    );
};

export default MenuTab;
