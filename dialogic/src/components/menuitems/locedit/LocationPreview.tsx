import React from 'react';
import Loc from '../../../game/Loc';
import { generateImageUrl } from '../../../Utils';
import { resolveImageProject } from '../../common/projectImages';
import { useProjectImages } from '../../common/ProjectImagesContext';
import './loc.css'

interface LocationPreviewProps {
    location: Loc;
    index: number;
    onClick: (index: number) => void;
}

const LocationPreview: React.FC<LocationPreviewProps> = ({ location, index, onClick }) => {
    const storageProject = resolveImageProject(useProjectImages());
    const style = (background?: string) => {
        if (background) {
            return {
                backgroundImage: `url("${generateImageUrl(background, storageProject)}")`
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
