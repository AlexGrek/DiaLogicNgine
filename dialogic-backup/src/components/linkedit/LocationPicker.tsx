import React from 'react';
import Loc from '../../game/Loc';
import { InputPicker, SelectPicker } from 'rsuite';

interface LocationPickerProps {
    locs: Loc[];
    value: string;
    onLocChange: (locUID: string | null) => void
}

const LocationPicker: React.FC<LocationPickerProps> = ({ locs, value, onLocChange }) => {
    const makeLocationsPickerData = (locs: Loc[]) => {
        return locs.map(d => ({ value: d.uid, label: d.displayName }))
    }

    return (
        <SelectPicker name='location-picker' style={{minWidth: '16em'}} data={makeLocationsPickerData(locs)} value={value} onChange={onLocChange}/>
    );
};

export default LocationPicker;
