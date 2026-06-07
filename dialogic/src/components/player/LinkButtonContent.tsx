import React from 'react';
import { DialogLink, resolveLinkIconPlacement } from '../../game/Dialog';
import IconSvg from '../common/IconSvg';

interface LinkButtonContentProps {
    link: DialogLink;
    text: string;
}

const LinkButtonContent: React.FC<LinkButtonContentProps> = ({ link, text }) => {
    const placement = resolveLinkIconPlacement(link);
    const icon = link.iconId
        ? <IconSvg iconId={link.iconId} className="dialog-link-icon" size={18} />
        : null;

    return (
        <span className={`dialog-link-label dialog-link-label--icon-${placement}`}>
            {placement === 'before' && icon}
            <span className="dialog-link-text">{text}</span>
            {placement === 'after' && icon}
        </span>
    );
};

export default LinkButtonContent;
