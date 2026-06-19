import React from 'react';
import { Button } from 'rsuite';
import ReadyRoundIcon from '@rsuite/icons/ReadyRound';
import './CodeSampleButton.css'

const MAX_LINES = 6

interface CodeSampleButtonProps {
    name: string;
    code?: string;
    onClick: () => void
}

const CodeSampleButton: React.FC<CodeSampleButtonProps> = ({ name, code, onClick }) => {

    // Keep only the first few lines so the snippet fits the button height.
    const shortenCode = (code: string) => {
        return code.split("\n").slice(0, MAX_LINES).join("\n")
    }

    return (
        <Button className="code-sample-button" onClick={onClick}>
            <div className="button-content-cs">
                <p className="header-cs"><ReadyRoundIcon style={{ fontSize: '1em' }} />
                    <span className="name-cs">{name}</span>
                </p>
                <pre>{shortenCode(code || "")}</pre>
            </div>
        </Button>
    );
};

export default CodeSampleButton;
