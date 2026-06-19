import React from 'react';
import { motion } from 'framer-motion';
import { LocRouteRenderView } from '../../exec/RenderView';
import "./player.css";
import { styleWithImage } from '../UiUtils';
import { resolveImageProject } from '../common/projectImages';
import { useProjectImages } from '../common/ProjectImagesContext';

interface LocButtonProps {
    route: LocRouteRenderView;
    onClick: (view: LocRouteRenderView) => void
    index?: number
}

const LocButton: React.FC<LocButtonProps> = ({ route, onClick, index = 0 }) => {
    const storageProject = resolveImageProject(useProjectImages());
    return (
        <motion.button
            className='route-button'
            name={`route-${route.index}`}
            disabled={route.disabled}
            title={route.disabled ? route.disabledReason : undefined}
            onClick={() => onClick(route)}
            style={styleWithImage(route.thumbnail, storageProject)}
            initial={{ opacity: 0, rotateX: 40, y: 16 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.05, ease: 'easeOut' }}
            whileHover={route.disabled ? undefined : { rotateX: 8, y: '6%' }}
        >
            <div className='route-button-inside'>
                <p>{route.name}</p>
            </div>
        </motion.button>
    );
};

export default LocButton;
