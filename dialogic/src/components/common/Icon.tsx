import React from 'react';

export type IconType = "fastforward" 

interface IconProps {
    className?: string;
    icon: IconType
}

function getIcon(icon: IconType) {
    switch (icon) {
        case "fastforward":
            return "9"
        default:
            return "\uE062"
    }
}

const Icon: React.FC<IconProps> = ({ icon, className }) => {
    const genClassName = (baseClass: string) => {
        if (className && className != '') {
            return `${baseClass} ${className}`
        }
        return baseClass
    }

    return (
        <span className={genClassName('icon-container')}>
            {getIcon(icon)}
        </span>
    );
};

export default Icon;
