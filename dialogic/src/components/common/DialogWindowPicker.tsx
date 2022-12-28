import React from 'react';
import { Cascader } from 'rsuite';
import Dialog from '../../game/Dialog';

const SEPARATOR = "#~@~#"

function encode(d: string, w: string) {
    return d + SEPARATOR + w
}

interface DialogWindowPickerProps {
    dialogs: Dialog[]
    chosen: [string, string] | null
    onValueChange: (d: string | null, w: string | null) => void
}

const DialogWindowPicker: React.FC<DialogWindowPickerProps> = ({ dialogs, onValueChange, chosen }) => {
    var uid = null
    if (chosen) {
        const dialogName = chosen[0]
        const windowName = chosen[1]
        uid = encode(dialogName, windowName)
    }

    const dataFromDialog = (d: Dialog) => {
        const uids = d.windows.map(w => w.uid)
        return uids.map(uid => ({
            value: encode(d.name, uid),
            label: uid
        }))
    }

    const data = dialogs.map(d => ({
        value: d.name,
        label: d.name,
        children: dataFromDialog(d)
    }))
    
    const onChange = (value: string | null) => {
        if (value) {
            const parts = value.split(SEPARATOR) 
            onValueChange(parts[0], parts[1])
        }
    }

    return (
        <Cascader style={{'minWidth': '15em'}} data={data} value={uid} onChange={(val, _) => onChange(val)} placement='autoVerticalStart' placeholder='Pick dialog window' />
    );
};

export default DialogWindowPicker;
