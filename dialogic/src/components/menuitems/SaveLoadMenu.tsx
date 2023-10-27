import React, { useEffect, useState } from 'react';
import { Button, Input, Radio, RadioGroup } from 'rsuite';
import { ValueType } from 'rsuite/esm/Radio';
import { SaveLoadManager } from '../../SaveLoadManager';
import { NotifyCallback } from '../../UiNotifications';
import { ENGINE_VERSION, GameDescription } from '../../game/GameDescription';
import { loadJsonStringAndPatch } from '../../game/Patches';
import SaveLoadJsonDrawer from './SaveLoadJsonDrawer';
import { trace } from '../../Trace';

interface SaveLoadMenuProps {
    currentGame: GameDescription;
    onSetGame: (game: GameDescription) => void;
    onNotify: NotifyCallback;
    visible: boolean
}

const SaveLoadMenu: React.FC<SaveLoadMenuProps> = ({ currentGame, onSetGame, onNotify }) => {
    const [game, setGame] = useState<GameDescription>(currentGame);
    const [name, setName] = useState<string>("");
    const [jsonMode, setJsonMode] = useState<boolean>(false);
    const [nameText, setNameText] = useState<string>("");
    const [list, setList] = useState<string[]>([])

    useEffect(() => {
        setGame(currentGame);
    }, [currentGame]);

    const updateSaves = () => {
        const man = new SaveLoadManager()
        setList(man.listGameNames())
        trace("Update saves")
    }

    useEffect(() => {
        updateSaves()
    }, [])

    const onSave = () => {
        const man = new SaveLoadManager()
        man.saveGameDescr(nameText, game)
        setName(nameText)
        updateSaves()
        onNotify("success", `Game saved to slot ${nameText}`, null)
    }

    const onLoad = () => {
        const man = new SaveLoadManager()
        const descr = man.loadGameDescr(nameText)
        setName(nameText)
        if (descr)
            onSetGame(descr)
    }

    const onChooseToLoad = (newName: ValueType) => {
        setName(`${newName}`)
        setNameText(`${newName}`)
    }

    const renderSavedGames = (games: string[]) => {
        return games.map(el => {
            return <Radio key={el} value={el}>{el}</Radio>
        })
    }

    const loadJson = (text: string) => {
        const isGameType = (game: any) => {
            return "dialogs" in game &&
                "facts" in game
        }
        try {
            const parsed: GameDescription = loadJsonStringAndPatch(text, ENGINE_VERSION)
            if (!isGameType(parsed)) {
                onNotify("error", "Failed to parse JSON", null)
                return;
            }
            setJsonMode(false)
            onSetGame(parsed)
        } catch (e) {
            onNotify("error", `${e}`, "JSON parsing error")
            return;
        }

    }

    const jsonModeLoader = () => {
        const close = () => setJsonMode(false)
        return <SaveLoadJsonDrawer gameInput={game} visible={jsonMode} onClose={close} onJsonLoad={loadJson}></SaveLoadJsonDrawer>
    }

    return (
        <div>
            <h1>Save/Load menu</h1>
            <p>Name: <Input value={nameText} onChange={setNameText}></Input></p>
            <Button disabled={nameText.length < 1} onClick={() => onSave()}>Save</Button>
            <Button disabled={nameText.length < 1} onClick={() => onLoad()}>Load</Button>
            <Button color="cyan" appearance="ghost" onClick={() => setJsonMode(true)}>JSON mode</Button>
            <p>endgame.</p>
            <div>
                <p>Saved:</p>
                <RadioGroup value={name} onChange={(value, _) => onChooseToLoad(value)}>
                    {renderSavedGames(list).reverse()}
                </RadioGroup>
            </div>
            {jsonModeLoader()}
        </div>
    );
};

export default SaveLoadMenu;
