import React from 'react';
import { Button } from 'rsuite';
import ReadyRoundIcon from '@rsuite/icons/ReadyRound';
import './CodeSampleButton.css'

const MAX_LINE_LENGTH = 30

interface CodeSampleButtonProps {
    name: string;
    code?: string;
    onClick: () => void
}

const CodeSampleButton: React.FC<CodeSampleButtonProps> = ({ name, code, onClick }) => {

    const shortenCode = (code: string) => {
        var firstNindex = -1
        var cropIndex = code.length
        var linei = 0;
        for (var i = 0; i < code.length; i++) {
            linei++;
            if (code[i] === "\n") {
                linei = 0;
                if (firstNindex > 0) {
                    cropIndex = i
                    break
                }
                else {
                    firstNindex = i
                }
            }
            if (linei > MAX_LINE_LENGTH) {
                cropIndex = MAX_LINE_LENGTH - 1
                break
            }
        }

        // crop by crop index
        const newCode = code.substring(0, cropIndex);
        return newCode;
    }

    return (
        <Button onClick={onClick}>
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
