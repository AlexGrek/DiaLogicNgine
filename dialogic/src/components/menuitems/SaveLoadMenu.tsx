import React, { useEffect, useState } from 'react';
import { Button, Input, Panel, Radio, RadioGroup, Stack } from 'rsuite';
import { ValueType } from 'rsuite/esm/Radio';
import { SaveLoadManager } from '../../SaveLoadManager';
import { NotifyCallback } from '../../UiNotifications';
import { ENGINE_VERSION, GameDescription } from '../../game/GameDescription';
import { loadJsonStringAndPatch } from '../../game/Patches';
import SaveLoadJsonDrawer from './SaveLoadJsonDrawer';
import { trace } from '../../Trace';
import PublicFileUrl from '../common/PublicFileUrl';
import DownloadAsJson from './saveload/DownloadAsJson';
import UploadJson from './saveload/UploadJson';

interface SaveLoadMenuProps {
    currentGame: GameDescription;
    onSetGame: (game: GameDescription) => void;
    onNotify: NotifyCallback;
    visible: boolean
}

const SaveLoadMenu: React.FC<SaveLoadMenuProps> = ({ currentGame, onSetGame, onNotify, visible }) => {
    const [game, setGame] = useState<GameDescription>(currentGame);
    const [name, setName] = useState<string>("");
    const [jsonMode, setJsonMode] = useState<boolean>(false);
    const [nameText, setNameText] = useState<string>("");
    const [list, setList] = useState<string[]>([])
    const [serverFile, setServerFile] = useState<string | undefined>(undefined)

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
            if (nameText === '') {
                setNameText(parsed.general.name)
            }
        } catch (e) {
            onNotify("error", `${e}`, "JSON parsing error")
            return;
        }

    }

    const jsonModeLoader = () => {
        const close = () => setJsonMode(false)
        return <SaveLoadJsonDrawer gameInput={game} visible={jsonMode} onClose={close} onJsonLoad={loadJson}></SaveLoadJsonDrawer>
    }

    const loadServerFile = (s: string | undefined) => {
        if (s === undefined) {
            return
        }
        const nameWithoutExt = s.replaceAll('.json', '')
        setName(nameWithoutExt)
        setNameText(nameWithoutExt)
        const url = 'games/' + s
        console.log('Loading server file ' + url)
        fetch(url).then(
            res => res.json()
        ).then(
            json => {
                console.log("Game json file downloaded")
                loadJson(JSON.stringify(json))
            }
        )
    }

    const handleJsonUpload = (data: string) => {
        loadJson(data)
    }

    if (!visible)
        return <div/>

    return (
        <div>
            <h1>Save/Load menu</h1>
            <p>Name: <Input value={nameText} onChange={setNameText}></Input></p>
            <Button disabled={nameText.length < 1} onClick={() => onSave()}>Save</Button>
            <Button disabled={nameText.length < 1} onClick={() => onLoad()}>Load</Button>
            <Button color="cyan" appearance="ghost" onClick={() => setJsonMode(true)}>JSON mode</Button>
            <p>endgame.</p>
            <Stack wrap justifyContent='space-between'>
            <Panel>
                <p>Saved in local storage:</p>
                <RadioGroup value={name} onChange={(value, _) => onChooseToLoad(value)}>
                    {renderSavedGames(list).reverse()}
                </RadioGroup>
            </Panel>
            <Panel id='server-file-loader' bordered>
                <p>Load server file:</p>
                <PublicFileUrl extensions={['json']} onChange={setServerFile} requestUrl="games/list.json"/>
                <Button id='load-server-file' disabled={serverFile === undefined} onClick={() => loadServerFile(serverFile)}>Load file</Button>
            </Panel>
            <Panel bordered>
                <p>Download game as JSON file</p>
                <DownloadAsJson data={game} filename={nameText}></DownloadAsJson>
                <p>Load JSON file</p>
                <UploadJson onUpload={handleJsonUpload}></UploadJson>
            </Panel>
            </Stack>
            {jsonModeLoader()}
        </div>
    );
};

export default SaveLoadMenu;
