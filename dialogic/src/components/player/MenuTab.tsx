import React, { useEffect, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State, createInitialState } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import { FONT_SIZE_LABELS, FontSizeId } from '../../game/GameDescription';
import { resolveVisuals } from './visualsClasses';
import SavesManager from '../../savegame/LocalStorageSavesManager';
import SaveGame from '../../savegame/Saves';
import { MAX_LETTER_SPEED_MS, MIN_LETTER_SPEED_MS, PlayerSettings } from './PlayerSettings';
import './MenuTab.css';

function formatRelativeTime(date: Date): string {
    const d = new Date(date)
    const diffMs = Date.now() - d.getTime()
    const sec = Math.round(diffMs / 1000)
    if (sec < 45) return "just now"
    const min = Math.round(sec / 60)
    if (min < 60) return `${min} min ago`
    const hrs = Math.round(min / 60)
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
    const days = Math.round(hrs / 24)
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
    return d.toLocaleDateString()
}

function formatFullDate(date: Date): string {
    const d = new Date(date)
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface MenuTabProps {
    gameExecutor: GameExecManager
    state: State
    localmanager: LocalizationManager
    manager: SavesManager
    onStateChange: (newState: State) => void
    onCloseMenu: () => void
    playerSettings: PlayerSettings
    onPlayerSettingsChange: (s: PlayerSettings) => void
}

type OpenMenu = "load" | "save" | "about"| "newgame" | "settings" | null

const MenuTab: React.FC<MenuTabProps> = ({ gameExecutor, state, localmanager, onStateChange, manager, onCloseMenu, playerSettings, onPlayerSettingsChange }) => {
    const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
    const [newSaveName, setNewSaveName] = useState<string>("")
    const [pendingDelete, setPendingDelete] = useState<string | null>(null)
    // Bump to force a re-read of saves after a delete (storage is external to React state).
    const [savesVersion, setSavesVersion] = useState<number>(0)

    useEffect(() => {
        setOpenMenu(null)
    }, [state])

    const handleSave = () => {
        manager.newSave(state, newSaveName.trim())
        setNewSaveName("")
        onCloseMenu()
    }

    const handleLoad = (loadState: State) => {
        onStateChange(loadState)
        onCloseMenu()
    }

    const handleDelete = (savegame: SaveGame) => {
        manager.deleteSave(savegame)
        setPendingDelete(null)
        setSavesVersion((v) => v + 1)
    }

    const handleRestart = () => {
        const initialState = createInitialState(gameExecutor.game)
        handleLoad(initialState)
    }

    const saveKey = (savegame: SaveGame) => `${savegame.name}|${new Date(savegame.created).getTime()}`

    const renderSaveCard = (savegame: SaveGame) => {
        const key = saveKey(savegame)
        const isPendingDelete = pendingDelete === key
        const badge = savegame.isAutosave ? "AUTO" : savegame.isQuicksave ? "QUICK" : null
        const badgeClass = savegame.isAutosave ? "auto" : savegame.isQuicksave ? "quick" : ""
        const step = savegame.state?.stepCount
        return (
            <div className='savegame-card' key={key}>
                <div className='savegame-card-main'>
                    <div className='savegame-card-header'>
                        <span className='savegame-name'>{savegame.name}</span>
                        {badge && <span className={`savegame-badge ${badgeClass}`}>{badge}</span>}
                    </div>
                    <div className='savegame-card-meta'>
                        <span className='savegame-date' title={formatFullDate(savegame.created)}>{formatRelativeTime(savegame.created)}</span>
                        {typeof step === 'number' && <span className='savegame-step'>{localmanager.local("step")} {step}</span>}
                    </div>
                </div>
                <div className='savegame-card-actions'>
                    {isPendingDelete ? (
                        <>
                            <button className='savegame-btn danger' onClick={() => handleDelete(savegame)}>{localmanager.local("Delete")}</button>
                            <button className='savegame-btn ghost' onClick={() => setPendingDelete(null)}>{localmanager.local("Cancel")}</button>
                        </>
                    ) : (
                        <>
                            <button className='savegame-btn primary' onClick={() => handleLoad(savegame.state)}>{localmanager.local("Load")}</button>
                            <button className='savegame-btn icon' title={localmanager.local("Delete")} onClick={() => setPendingDelete(key)}>&#x2715;</button>
                        </>
                    )}
                </div>
            </div>
        )
    }

    const renderSaveGroup = (title: string, saves: SaveGame[]) => {
        if (saves.length === 0) return null
        return (
            <div className='savegame-group' key={title}>
                <p className='savegame-group-title'>{title}</p>
                <div className='savegame-group-list'>
                    {saves.map(renderSaveCard)}
                </div>
            </div>
        )
    }

    const renderLoadMenuDetails = () => {
        // savesVersion forces a fresh read after deletes
        void savesVersion
        const grouped = manager.listGroupedSaves()
        const total = grouped.manual.length + grouped.quick.length + grouped.auto.length
        return <div className='savegame-list-container'>
            {total === 0 ? (
                <div className='savegame-empty'>
                    <p className='savegame-empty-title'>{localmanager.local("No saved games yet")}</p>
                    <p className='savegame-empty-sub'>{localmanager.local("Your saves will appear here")}</p>
                </div>
            ) : (
                <>
                    {renderSaveGroup(localmanager.local("Saves"), grouped.manual)}
                    {renderSaveGroup(localmanager.local("Quicksaves"), grouped.quick)}
                    {renderSaveGroup(localmanager.local("Autosaves"), grouped.auto)}
                </>
            )}
        </div>
    }

    const renderSaveMenuDetails = () => {
        return <div className='savegame-new-container'>
            <p className='savegame-new-title'>{localmanager.local("Create new save")}</p>
            <input
                className='savegame-new-input'
                value={newSaveName}
                placeholder={localmanager.local("Save name (optional)")}
                onChange={(ev) => setNewSaveName(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') handleSave() }}
                autoFocus
            ></input>
            <button className='savegame-btn primary wide' name='save' onClick={handleSave}>{localmanager.local("Save")}</button>
        </div>
    }

    const renderNewgameMenuDetails = () => {
        return <div className='savegame-new-container'>
            <p>{localmanager.local("Confirm restart")}</p>
            <button className='savegame-btn danger wide' name='restart' onClick={handleRestart}>{localmanager.local("Start new game")}</button>
        </div>
    }

    const renderAboutMenuDetails = () => {
        return <div className='game-menu-tab-about'>
            <h3>{gameExecutor.game.general.name} <code>{gameExecutor.game.general.version}</code></h3>
            <p>{gameExecutor.game.general.description}</p>
            <p>{gameExecutor.game.general.authors}</p>
        </div>
    }

    const renderFontSizeButtons = (value: FontSizeId, onChange: (v: FontSizeId) => void) => (
        <div className='player-settings-font-size-row'>
            {FONT_SIZE_LABELS.map(({ value: v, label }) => (
                <button
                    key={v}
                    className={`player-settings-font-size-btn${value === v ? ' active' : ''}`}
                    onClick={() => onChange(v)}
                >
                    {label}
                </button>
            ))}
        </div>
    );

    const renderSettingsMenuDetails = () => {
        const authorShortHistory = resolveVisuals(gameExecutor.game.visuals).shortHistoryVisible
        return (
            <div className='game-menu-tab-settings' data-testid="player-settings-panel" style={{ marginLeft: 8, marginRight: 8 }}>
                <label className='player-settings-row'>
                    <input
                        type="checkbox"
                        checked={playerSettings.letterByLetter}
                        onChange={(ev) => onPlayerSettingsChange({ ...playerSettings, letterByLetter: ev.target.checked })}
                        data-testid="player-settings-letter-by-letter"
                    />
                    <span>{localmanager.local("Letter by letter")}</span>
                </label>
                {authorShortHistory && (
                    <label className='player-settings-row'>
                        <input
                            type="checkbox"
                            checked={playerSettings.shortHistory}
                            onChange={(ev) => onPlayerSettingsChange({ ...playerSettings, shortHistory: ev.target.checked })}
                            data-testid="player-settings-short-history"
                        />
                        <span>{localmanager.local("Short history")}</span>
                    </label>
                )}
                {playerSettings.letterByLetter && (
                    <label className='player-settings-row player-settings-speed'>
                        <span>{localmanager.local("Text speed")}</span>
                        <input
                            type="range"
                            min={MIN_LETTER_SPEED_MS}
                            max={MAX_LETTER_SPEED_MS}
                            value={playerSettings.letterByLetterSpeedMs}
                            onChange={(ev) => onPlayerSettingsChange({
                                ...playerSettings,
                                letterByLetterSpeedMs: parseInt(ev.target.value, 10),
                            })}
                            data-testid="player-settings-speed"
                        />
                        <span className='player-settings-speed-label'>
                            {playerSettings.letterByLetterSpeedMs} ms
                        </span>
                    </label>
                )}
                <div className='player-settings-section'>
                    <span className='player-settings-label'>{localmanager.local("Text size")}</span>
                    {renderFontSizeButtons(playerSettings.textFontSize, (textFontSize) =>
                        onPlayerSettingsChange({ ...playerSettings, textFontSize })
                    )}
                </div>
                <div className='player-settings-section'>
                    <span className='player-settings-label'>{localmanager.local("Answers size")}</span>
                    {renderFontSizeButtons(playerSettings.responsesFontSize, (responsesFontSize) =>
                        onPlayerSettingsChange({ ...playerSettings, responsesFontSize })
                    )}
                </div>
            </div>
        )
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
            case "settings":
                return renderSettingsMenuDetails()
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
            <button className={genClassNameForButton("settings")} onClick={() => setOpenMenu("settings")}>{localmanager.local("Settings")}</button>
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
