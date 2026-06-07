import React from 'react';
import { LocRouteRenderView } from '../../exec/RenderView';
import "./player.css";
import { styleWithImage } from '../UiUtils';
import { resolveImageProject } from '../common/projectImages';
import { useProjectImages } from '../common/ProjectImagesContext';

interface LocButtonProps {
    route: LocRouteRenderView;
    onClick: (view: LocRouteRenderView) => void
}

const LocButton: React.FC<LocButtonProps> = ({ route, onClick }) => {
    const storageProject = resolveImageProject(useProjectImages());
    return (
        <button key={route.index} className='route-button' name={`route-${route}`} onClick={() => onClick(route)} style={styleWithImage(route.thumbnail, storageProject)}>
            <div className='route-button-inside'>
                <p>{route.name}</p>
            </div>
        </button>
    );
};

export default LocButton;
