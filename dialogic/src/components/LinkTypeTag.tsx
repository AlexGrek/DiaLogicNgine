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
    [LinkType.Push]: asColor("orange")
}

const Icons = {
    [LinkType.Local]: "$",
    [LinkType.Pop]: "J",
    [LinkType.Push]: "\""
}

const LinkTypeTag: React.FC<LinkTypeTagProps> = ({ value }) => {
    const color: Color = Colors[value];

    return (
        <Tag color={color} className='link-type-tag-regular'><span className='link-type-tag-icon'>{Icons[value]}</span></Tag>
    );
};

export default LinkTypeTag;
