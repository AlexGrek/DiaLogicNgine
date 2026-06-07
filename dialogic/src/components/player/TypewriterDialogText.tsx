import React from 'react';

interface TypewriterDialogTextProps {
    fullText: string;
    displayText: string;
    reserveLayout: boolean;
}

const TypewriterDialogText: React.FC<TypewriterDialogTextProps> = ({
    fullText,
    displayText,
    reserveLayout,
}) => {
    if (!reserveLayout || !fullText) {
        return <p className="dialog-current-text">{displayText}</p>;
    }

    return (
        <>
            <p className="dialog-current-text dialog-current-text--measure" aria-hidden="true">
                {fullText}
            </p>
            <p className="dialog-current-text dialog-current-text--visible">
                {displayText}
            </p>
        </>
    );
};

export default TypewriterDialogText;
