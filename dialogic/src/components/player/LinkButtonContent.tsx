import React from 'react';
import { LinkIconPlacement } from '../../game/Dialog';
import IconSvg from '../common/IconSvg';

interface LinkButtonContentProps {
    /** Already resolved: the link's own icon, else the category icon, else none. */
    icon: { iconId: string; placement: LinkIconPlacement } | null;
    text: string;
}

const LinkButtonContent: React.FC<LinkButtonContentProps> = ({ icon, text }) => {
    const placement = icon?.placement ?? 'before';
    const iconNode = icon
        ? <IconSvg iconId={icon.iconId} className="dialog-link-icon" size={18} />
        : null;

    return (
        <span className={`dialog-link-label dialog-link-label--icon-${placement}`}>
            {placement === 'before' && iconNode}
            <span className="dialog-link-text">{text}</span>
            {placement === 'after' && iconNode}
        </span>
    );
};

export default LinkButtonContent;
