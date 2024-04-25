import React, { useEffect, useRef, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State, createInitialState } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import SavesManager from '../../savegame/LocalStorageSavesManager';
import './MenuTab.css';

interface MenuTabProps {
    gameExecutor: GameExecManager
    state: State
    localmanager: LocalizationManager
    manager: SavesManager
    onStateChange: (newState: State) => void
    onCloseMenu: Function
}

type OpenMenu = "load" | "save" | "about"| "newgame" | null

const MenuTab: React.FC<MenuTabProps> = ({ gameExecutor, state, localmanager, onStateChange, manager, onCloseMenu }) => {
    const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
    const [newSaveName, setNewSaveName] = useState<string>("")

    useEffect(() => {
        setOpenMenu(null)
    }, [state])

    const handleSave = () => {
        manager.newSave(state, newSaveName)
        setNewSaveName("")
        onCloseMenu()
    }

    const handleLoad = (loadState: State) => {
        onStateChange(loadState)
        onCloseMenu()
    }

    const handleRestart = () => {
        const initialState = createInitialState(gameExecutor.game)
        handleLoad(initialState)
    }

    const renderLoadMenuDetails = () => {
        return <div className='savegame-list-container'>
            {manager.listAllSaves().map((savegame) => {
                return <div className='savegame-container'>
                    <p className='savegame-name'>{savegame.name}</p>
                    <p className='savegame-date'>{`${savegame.created}`}</p>
                    <p className='savegame-attributes'>{savegame.isAutosave ? "auto" : ""}{savegame.isQuicksave ? "quick" : ""}</p>
                    <button onClick={() => handleLoad(savegame.state)}>Load</button>
                </div>
            })}
        </div>
    }

    const renderSaveMenuDetails = () => {
        return <div className='savegame-new-container'>
            <p>{localmanager.local("Create new save")}</p>
            <input value={newSaveName} onChange={(ev) => setNewSaveName(ev.target.value)}></input>
            <button name='save' onClick={handleSave}>{localmanager.local("Save")}</button>
        </div>
    }

    const renderNewgameMenuDetails = () => {
        return <div className='savegame-new-container'>
            <p>{localmanager.local("Confirm restart")}</p>
            <button name='restart' onClick={handleRestart}>{localmanager.local("Start new game")}</button>
        </div>
    }

    const renderAboutMenuDetails = () => {
        return <div className='game-menu-tab-about'>
            <h3>{gameExecutor.game.general.name} <code>{gameExecutor.game.general.version}</code></h3>
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
            case "newgame":
                    return renderNewgameMenuDetails()
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
            <button className={genClassNameForButton("newgame")} onClick={() => setOpenMenu("newgame")}>{localmanager.local("New game")}</button>
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
