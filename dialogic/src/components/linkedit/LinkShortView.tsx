import React from 'react';
import 'animate.css';
import Dialog, { DialogLink } from '../../game/Dialog';
import LinkTypeTag from '../LinkTypeTag';
import { Tag } from 'rsuite';

interface LinkShortViewProps {
    index: number;
    link: DialogLink;
    onLinkClick: (i: number) => void;
}

const LinkShortView: React.FC<LinkShortViewProps> = ({ link, index, onLinkClick }) => {
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

    return (
        <div className='link-short-view animate__animated animate__fadeInLeft animate__faster' onClick={clickHandler}>
            <p className='link-short-view-text'>{link.text}<span className='link-tags'>     {linkTags()}</span></p>
            <p className='link-short-view-target'><LinkTypeTag value={link.mainDirection.type}/>{link.mainDirection.direction}</p>
        </div>
            
        
    );
};

export default LinkShortView;
