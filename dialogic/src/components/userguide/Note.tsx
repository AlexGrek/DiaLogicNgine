import React from 'react';
import Markdown from 'react-markdown'
import './Note.css'

interface NoteProps {
    text: string;
}

const Note: React.FC<NoteProps> = ({ text }) => {
    return (
        <div className='note-around'>
        <div className='note-outer'>
            <div className='note-pin'></div>
            <div className='note-container'>

                <Markdown>{text}</Markdown>
            </div>
        </div>
        </div>
    );
};

export default Note;
