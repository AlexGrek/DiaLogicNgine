import React from 'react';
import 'animate.css';
import Dialog, { DialogLink, LinkType } from '../../game/Dialog';
import LinkTypeTag from '../LinkTypeTag';
import { Tag } from 'rsuite';

interface LinkShortViewProps {
    index: number;
    link: DialogLink;
    onLinkClick: (i: number) => void;
    noninteractive?: boolean
}

const LOCAL_LINK_TYPES = [LinkType.Local, LinkType.NavigateToLocation, LinkType.TalkToPerson, LinkType.QuickReply]

const LinkShortView: React.FC<LinkShortViewProps> = ({ link, index, onLinkClick, noninteractive }) => {
    const clickHandler = (e: React.MouseEvent) => {
        e.stopPropagation();
        onLinkClick(index);
    }

    const linkTags = () => {
        const tags = []
        if (link.changeLocationInBg) {
            const tag = <Tag color="cyan">loc</Tag>
            tags.push(tag)
        }
        if (link.alternativeDirections.length > 0) {
            const tag = <Tag color="red">alt</Tag>
            tags.push(tag)
        }
        if (link.actionCode) {
            const tag = <Tag color="green">code</Tag>
            tags.push(tag)
        }
        if (link.isEnabled) {
            const tag = <Tag color="orange">disabled</Tag>
            tags.push(tag)
        }
        if (link.isVisible) {
            const tag = <Tag color="orange">hidden</Tag>
            tags.push(tag)
        }
        return tags
    }

    const classes = "link-short-view" + (noninteractive ? "" : " animate__animated animate__fadeInLeft animate__faster")
    const linkDirection = LOCAL_LINK_TYPES.includes(link.mainDirection.type) ? link.mainDirection.direction : 
                    `${link.mainDirection.qualifiedDirection?.dialog}.${link.mainDirection.qualifiedDirection?.window}`
    return (
        <div className={classes} onClick={noninteractive ? undefined : clickHandler}>
            <p className='link-short-view-text'>{link.text}<span className='link-tags'>     {linkTags()}</span></p>
            <p className='link-short-view-target'><LinkTypeTag value={link.mainDirection.type}/>{linkDirection}</p>
        </div>
            
        
    );
};

export default LinkShortView;
