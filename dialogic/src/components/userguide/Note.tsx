import React from 'react';
import Markdown from 'react-markdown'
import './Note.css'

interface NoteProps {
    text: string;
    warning?: boolean;
}

const Note: React.FC<NoteProps> = ({ text, warning }) => {

    const getClass = (base: string) => {
        if (warning) {
            return `${base} warning`
        }
        return base
    }

    return (
        <div className='note-around'>
        <div className={getClass('note-outer')}>
            <div className={getClass('note-pin')}></div>
            <div className='note-container'>
                <Markdown>{text}</Markdown>
            </div>
        </div>
        </div>
    );
};

export default Note;
