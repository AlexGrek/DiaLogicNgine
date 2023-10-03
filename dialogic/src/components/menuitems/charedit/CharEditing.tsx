import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import Character from '../../../game/Character';
import './charediting.css';
import CharRoleEditing from './CharRoleEditing';
import PropsEditMenu from '../scriptedit/PropsEditMenu';
import Prop from '../../../game/Prop';
import { Panel, PanelGroup } from 'rsuite';
import TextListEditor from '../../common/text_list/TextListEditor';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';
import CodeSampleButton from '../../common/CodeSampleButton';
import ImageListEditor from '../../common/text_list/ImageListEditor';
import { ImageList } from '../../../game/ImageList';

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

interface CharEditingProps {
    game: GameDescription;
    char: Character
    onCharacterChange: (char: Character) => void
}

type CodeEditMenu = "chooseAvatarScript" | "chooseNameScript" | "chooseDescriptionScript"

const CharEditing: React.FC<CharEditingProps> = ({ game, char, onCharacterChange }) => {
    const [ch, setCh] = useState<Character>(char);

    // enable code editor props
    const [codeEditMenu, setCodeEditMenu] = useState<CodeEditMenu>("chooseNameScript");
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false);

    useEffect(() => {
        setCh(char);
    }, [char]);

    const save = () => {
        onCharacterChange(ch)
    }

    const forceUpdate = (ch: Character) => {
        onCharacterChange(ch)
    }

    const renderCodeEditor = (menu: CodeEditMenu) => {
        const code = ch[menu]
        return <PopupCodeEditor ui={CODE_EDITOR_UI_NAMESELECTOR} code={code || ""} onSaveClose={(s) => editCode(menu, s)} open={codeEditorOpen}></PopupCodeEditor>
    }

    const editCode = (menu: CodeEditMenu, val: string) => {
        const upd = val.trim() === "" ? undefined : val;
        setCh({...ch, [menu]: upd})
        setCodeEditorOpen(false)
    }

    const renderCodeEditButton = (prop: CodeEditMenu, name?: string) => {
        const displayName = name || prop
        const codeEdit = (menu: CodeEditMenu) => {
            setCodeEditMenu(menu)
            setCodeEditorOpen(true)
        }
        return <CodeSampleButton onClick={() => codeEdit(prop)} name={displayName} code={ch[prop]}/>
    }

    const avatar = (img: ImageList) => {
        if (img.main === undefined) {
            return null
        }
        const uri = img.main
        return <img alt="background image preview" height="128" src={`game_assets/${uri}`}></img>
    }

    return (
        <div className='char-editing-main-container' onBlur={save}>
            <p>{avatar(ch.avatar)}{ch.uid}</p>
            <PanelGroup accordion bordered className='char-editing-main-menu'>
                <Panel header="Display name" defaultExpanded>
                    <TextListEditor singleLine={true} textList={ch.displayName} onChange={p => setCh({ ...ch, displayName: p })}/>
                </Panel>
                <Panel header="Avatar Image">
                    <ImageListEditor imageList={char.avatar} onChange={value => setCh({ ...ch, avatar: value})}/>
                </Panel>
                <Panel header="Roles">
                <CharRoleEditing game={game} char={ch} onCharacterChange={forceUpdate} />
                </Panel>
                <Panel header="Personal props">
                    <PropsEditMenu props={ch.props} onSetProps={p => setCh({ ...ch, props: p })} />
                </Panel>
                <Panel header="Scripting">
                    {renderCodeEditButton("chooseNameScript")}
                    {renderCodeEditButton("chooseAvatarScript")}
                    {renderCodeEditButton("chooseDescriptionScript")}
                </Panel>
                <Panel header="Display description">
                    <TextListEditor singleLine={false} textList={ch.description} onChange={p => setCh({ ...ch, description: p })}/>
                </Panel>
            </PanelGroup>
            {renderCodeEditor(codeEditMenu)}
            
            
        </div>
    );
};

export default CharEditing;
