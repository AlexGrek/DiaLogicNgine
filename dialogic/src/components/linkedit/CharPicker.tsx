import React from 'react';
import Loc from '../../game/Loc';
import { InputPicker, SelectPicker } from 'rsuite';
import Character from '../../game/Character';

interface CharPickerProps {
    chars: Character[];
    value: string;
    onChange: (charUid: string | null) => void
    dialogOnly: boolean
}

const CharPicker: React.FC<CharPickerProps> = ({ chars, value, onChange, dialogOnly }) => {
    const makeLocationsPickerData = (chars: Character[]) => {
        const ch = dialogOnly ? chars.filter(char => char.dialog !== undefined) : chars
        return ch.map(c => ({ label: c.displayName.main === '' ? c.uid : c.displayName.main, value: c.uid }))
    }

    return (
        <SelectPicker style={{minWidth: '16em'}} data={makeLocationsPickerData(chars)} value={value} onChange={onChange}/>
    );
};

export default CharPicker;
