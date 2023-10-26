import React, { useState, useEffect } from 'react';
import { GeneralGameInfo } from '../../../game/GameDescription';
import { Drawer, Input, InputProps } from 'rsuite';
import StringListEditor from '../../common/StringListEditor';
import StringMapEditor from '../../common/StringMapEditor';

interface GeneralEditorProps {
    value: GeneralGameInfo;
    open: boolean;
    onChange: (g: GeneralGameInfo) => void
    onClose: () => void
}

const TEXTAREA_FOR = ["description"]

const GeneralEditor: React.FC<GeneralEditorProps> = ({ value, onClose, onChange, open }) => {
    const [general, setGeneral] = useState<GeneralGameInfo>(value);
    useEffect(() => {
        setGeneral(general);
    }, [general]);

    const setStrProp = (prop: keyof GeneralGameInfo) => (value: string) => {
        setGeneral({...general, [prop]: value})
    }

    const onDone = () => {
        onChange(general)
        onClose()
    }

    const renderStrPropEditor = (prop: keyof GeneralGameInfo) => {
        var input;
        if (TEXTAREA_FOR.includes(prop)) {
            input = <Input as="textarea" rows={3} value={general[prop].toString()} onChange={setStrProp(prop)}/>
        } else {
            input = <Input value={general[prop].toString()} onChange={setStrProp(prop)}/>
        }
        return <p>
            <b>{prop}</b>
            <br/>
            {input}
        </p>
    }

    return (
        <Drawer open={open} onClose={() => onDone()}>
        <Drawer.Body>
            {renderStrPropEditor("name")}<br/>
            {renderStrPropEditor("description")}<br/>
            {renderStrPropEditor("version")}<br/>
            <b>Authors</b>
            <StringListEditor value={general.authors} onChange={val => setGeneral({...general, authors: val})}/>
            <br/>
            <b>Additional info</b>
            <StringMapEditor value={general.extras} onChange={val => setGeneral({...general, extras: val})}/>
        </Drawer.Body>
      </Drawer>
    );
};

export default GeneralEditor;
