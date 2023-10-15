import React from 'react';
import { Tag } from 'rsuite';
import { LinkType } from '../game/Dialog';
import { asColor, Color } from '../Utils';

interface LinkTypeTagProps {
    value: LinkType;
}

const Colors = {
    [LinkType.Local]: asColor("blue"),
    [LinkType.Pop]: asColor("violet"),
    [LinkType.Push]: asColor("orange"),
    [LinkType.NavigateToLocation]: asColor("cyan"),
    [LinkType.TalkToPerson]: asColor("green"),
    [LinkType.Jump]: asColor("red"),
    [LinkType.ResetJump]: asColor("red")
}

const Icons = {
    [LinkType.Local]: "$",
    [LinkType.Pop]: "J",
    [LinkType.Push]: "\"",
    [LinkType.NavigateToLocation]: "\ue01c",
    [LinkType.TalkToPerson]: "\ue066",
    [LinkType.Jump]: "5",
    [LinkType.ResetJump]: "9"
}

const LinkTypeTag: React.FC<LinkTypeTagProps> = ({ value }) => {
    const color: Color = Colors[value];

    return (
        <Tag color={color} className='link-type-tag-regular'><span className='link-type-tag-icon'>{Icons[value]}</span></Tag>
    );
};

export default LinkTypeTag;
