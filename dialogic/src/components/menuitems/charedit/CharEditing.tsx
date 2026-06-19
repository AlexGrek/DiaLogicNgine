import React, { useEffect, useState } from 'react';
import { generateImageUrl } from '../../../Utils';
import { IconButton, Panel, PanelGroup } from 'rsuite';
import { MessageSquare, User } from 'lucide-react';
import Character from '../../../game/Character';
import { GameDescription } from '../../../game/GameDescription';
import { ImageList } from '../../../game/ImageList';
import CodeSampleButton from '../../common/CodeSampleButton';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';
import ImageListEditor from '../../common/text_list/ImageListEditor';
import { resolveImageProject } from '../../common/projectImages';
import { useProjectImages } from '../../common/ProjectImagesContext';
import TextListEditor from '../../common/text_list/TextListEditor';
import PropsEditMenu from '../scriptedit/PropsEditMenu';
import CharRoleEditing from './CharRoleEditing';
import './charediting.css';
import ConfirmDeleteButtonSmall from '../../common/ConfirmDeleteButtonSmall';
import CharDialogEditorDrawer from './CharDialogEditorDrawer';
import { IUpds } from '../../../App';
import CopyButton from '../../common/copypaste/CopyButton';

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
    onDelete: (uid: string) => void
    handlers: IUpds
}

type CodeEditMenu = "chooseAvatarScript" | "chooseNameScript" | "chooseDescriptionScript"

const CharEditing: React.FC<CharEditingProps> = ({ game, char, onCharacterChange, onDelete, handlers }) => {
    const [ch, setCh] = useState<Character>(char);
    const [dialogEditorOpen, setDialogEditorOpen] = useState<boolean>(false);
    const storageProject = resolveImageProject(useProjectImages());

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
        return <PopupCodeEditor game={game} ui={CODE_EDITOR_UI_NAMESELECTOR} code={code || ""} onSaveClose={(s) => editCode(menu, s)} open={codeEditorOpen} onAddSituation={handlers.createSituation}></PopupCodeEditor>
    }

    const editCode = (menu: CodeEditMenu, val: string) => {
        const upd = val.trim() === "" ? undefined : val;
        setCh({ ...ch, [menu]: upd })
        setCodeEditorOpen(false)
    }

    const renderCodeEditButton = (prop: CodeEditMenu, name?: string) => {
        const displayName = name || prop
        const codeEdit = (menu: CodeEditMenu) => {
            setCodeEditMenu(menu)
            setCodeEditorOpen(true)
        }
        return <CodeSampleButton onClick={() => codeEdit(prop)} name={displayName} code={ch[prop]} />
    }

    const avatar = (img: ImageList) => {
        if (img.main === undefined) {
            return <div className="char-editing-avatar char-editing-avatar-placeholder"><User size={28} /></div>
        }
        const uri = img.main
        return <img className="char-editing-avatar" alt={`${ch.uid} avatar`} src={generateImageUrl(uri, storageProject)}></img>
    }

    const renderDeleteButton = () => {
        return <ConfirmDeleteButtonSmall onConfirm={() => onDelete(char.uid)} />
    }

    const charNameParts = [ch.displayName.main, ...ch.displayName.list.map(e => e.text)].filter(Boolean)
    const charDescParts = [ch.description.main, ...ch.description.list.map(e => e.text)].filter(Boolean)
    const charContext = [...charNameParts, ...charDescParts].join('; ')

    return (
        <div className='char-editing-main-container' onBlur={save}>
            <div className='char-editing-header'>
                <div className='char-editing-header-identity'>
                    {avatar(ch.avatar)}
                    <div className='char-editing-identity-text'>
                        <span className='char-editing-identity-label'>Character</span>
                        <span className='char-editing-uid'>{ch.uid}</span>
                    </div>
                </div>
                <div className='char-editing-header-actions'>
                    <IconButton appearance='primary' color='green' icon={<MessageSquare size={16} />} onClick={() => setDialogEditorOpen(true)}>Dialog...</IconButton>
                    <CopyButton handlers={handlers} typename={'char'} obj={ch}/>
                    {renderDeleteButton()}
                </div>
            </div>
            <PanelGroup accordion bordered className='char-editing-main-menu'>
                <Panel header="Display name" defaultExpanded>
                    <TextListEditor singleLine={true} textList={ch.displayName} onChange={p => setCh({ ...ch, displayName: p })} />
                </Panel>
                <Panel header="Avatar Image">
                    <ImageListEditor
                        imageList={ch.avatar}
                        onChange={value => forceUpdate({ ...ch, avatar: value })}
                        quickAiPrompt={charContext ? `${charContext}, character portrait, face` : 'character portrait, face'}
                        basicPromptSuffix={game.dev?.basicPromptSuffix}
                    />
                </Panel>
                <Panel header="Roles">
                    <CharRoleEditing game={game} char={ch} onCharacterChange={forceUpdate} />
                </Panel>
                <Panel header="Personal props">
                    <PropsEditMenu game={game} props={ch.props} onSetProps={p => setCh({ ...ch, props: p })} />
                </Panel>
                <Panel header="Scripting">
                    {renderCodeEditButton("chooseNameScript")}
                    {renderCodeEditButton("chooseAvatarScript")}
                    {renderCodeEditButton("chooseDescriptionScript")}
                </Panel>
                <Panel header="Display description">
                    <TextListEditor singleLine={false} textList={ch.description} onChange={p => setCh({ ...ch, description: p })} />
                </Panel>
            </PanelGroup>
            {renderCodeEditor(codeEditMenu)}
            <CharDialogEditorDrawer value={ch} open={dialogEditorOpen} onUpdate={onCharacterChange} onClose={() => setDialogEditorOpen(false)} game={game} handlers={handlers} />


        </div>
    );
};

export default CharEditing;
