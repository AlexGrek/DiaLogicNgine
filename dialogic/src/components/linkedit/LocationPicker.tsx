import React from 'react';
import Loc from '../../game/Loc';
import { InputPicker } from 'rsuite';

interface LocationPickerProps {
    locs: Loc[];
    value: string;
    onLocChange: (locUID: string) => void
}

const LocationPicker: React.FC<LocationPickerProps> = ({ locs, value, onLocChange }) => {
    const makeLocationsPickerData = (locs: Loc[]) => {
        return locs.map(d => ({ value: d.uid, label: d.displayName }))
    }

    return (
        <InputPicker creatable={false} data={makeLocationsPickerData(locs)} value={value} onChange={onLocChange}></InputPicker>
    );
};

export default LocationPicker;
