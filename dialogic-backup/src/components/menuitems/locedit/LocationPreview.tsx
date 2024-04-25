import React from 'react';
import Loc from '../../../game/Loc';
import './loc.css'

interface LocationPreviewProps {
    location: Loc;
    index: number;
    onClick: (index: number) => void;
}

const LocationPreview: React.FC<LocationPreviewProps> = ({ location, index, onClick }) => {
    const style = (background?: string) => {
        if (background) {
            return { 
                backgroundImage: `url("game_assets/${background}")`
            }
        }
        else
            return {}
    }

    return (
        <div className='locprBackground' style={style(location.thumbnail)} onClick={() => onClick(index)}>
            <div className='locprInner'>
                <p className='locprName'>{location.displayName}</p>
            </div>
        </div>
    );
};

export default LocationPreview;
