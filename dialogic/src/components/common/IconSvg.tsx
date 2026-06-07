import React from 'react';
import { findIconDef } from '../../lib/icons';
import { renderIconPaths } from '../../lib/icons/render';

interface IconSvgProps {
    iconId: string;
    className?: string;
    size?: number;
}

const IconSvg: React.FC<IconSvgProps> = ({ iconId, className, size = 24 }) => {
    const found = findIconDef(iconId);
    if (!found) return null;

    const { pack, def } = found;
    return (
        <svg
            className={className}
            viewBox={`0 0 ${pack.viewBox} ${pack.viewBox}`}
            width={size}
            height={size}
            stroke="currentColor"
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {renderIconPaths(def)}
        </svg>
    );
};

export default IconSvg;
