import React from 'react';
import 'animate.css';
import { Button, ButtonGroup, ButtonToolbar, IconButton, Input, Tag } from 'rsuite';
import PagePreviousIcon from '@rsuite/icons/PagePrevious';
import { DialogLink, LinkType } from '../../game/Dialog';
import { Divider } from 'rsuite';
import ExitIcon from '@rsuite/icons/Exit';
import ButtonPanelSelector from '../ButtonPanelSelector';
import { allEnumPairsOf, allEnumValuesOf } from '../../Utils';

interface LinkEditorProps {
    link: DialogLink;
    index: number;
    onLinkChange: (link: DialogLink, index: number) => void;
    onEditingDone: Function;
}

const LinkEditor: React.FC<LinkEditorProps> = ({ link, index, onLinkChange, onEditingDone }) => {

    const editingDone = () => {
        onEditingDone()
    }

    const editText = (s: string) => {
        const linkUpdate = {...link, text: s};
        onLinkChange(linkUpdate, index);
    }

    const editType = (type: LinkType) => {
        const linkUpdate = {...link, type: type};
        onLinkChange(linkUpdate, index);
    }

    const linkTypes = allEnumPairsOf(LinkType);
    const enumKeys = linkTypes.map(el => el.key);
    const enumNames = linkTypes.map(el => <Tag>{el.value}</Tag>);

    return (
        <div className="link-editor-body animate__animated animate__fadeInRight animate__faster">
            <IconButton icon={<PagePreviousIcon />} placement="left" onClick={() => editingDone()}>
                Done
            </IconButton>
            <Divider></Divider>
            <p>Direction:</p>
            
            <ButtonToolbar>
            <ButtonPanelSelector chosen={link.type} variants={enumKeys} buttonData={enumNames} onValueChanged={editType} ></ButtonPanelSelector>
            </ButtonToolbar>
            <p>Text:</p>
            <Input onChange={editText} value={link.text}></Input>
        </div>

    );
};

export default LinkEditor;
