import React from 'react';
import 'animate.css';
import Dialog, { DialogLink } from '../../game/Dialog';
import LinkTypeTag from '../LinkTypeTag';

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

    return (
        <div className='link-short-view animate__animated animate__fadeInLeft animate__faster' onClick={clickHandler}>
            <p className='link-short-view-text'>{link.text}</p>
            <p className='link-short-view-target'><LinkTypeTag value={link.type}/>{link.direction}</p>
        </div>
            
        
    );
};

export default LinkShortView;
