import React from 'react';

interface TypewriterDialogTextProps {
    fullText: string;
    displayText: string;
}

/**
 * Renders the full text always, with the not-yet-revealed tail kept transparent.
 * The element box therefore never changes while the typewriter runs, so nothing
 * below it reflows and any framer-motion layout morph of this element stays clean.
 */
const TypewriterDialogText: React.FC<TypewriterDialogTextProps> = ({ fullText, displayText }) => {
    const revealed = fullText.startsWith(displayText) ? displayText : fullText;
    const rest = fullText.slice(revealed.length);
    return (
        <>
            <span className="dlg-line-typed">{revealed}</span>
            {rest && <span className="dlg-line-rest" aria-hidden="true">{rest}</span>}
        </>
    );
};

export default TypewriterDialogText;
