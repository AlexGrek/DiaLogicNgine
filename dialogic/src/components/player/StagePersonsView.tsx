import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StagePersonView } from '../../exec/RenderView';
import { DialogTextAlignment } from '../../game/GameDescription';
import { generateImageUrl } from '../../Utils';
import { resolveImageProject } from '../common/projectImages';
import { useProjectImages } from '../common/ProjectImagesContext';
import './stagepersons.css';

interface StagePersonsViewProps {
    persons: StagePersonView[];
    /** The text panel's side; persons stand on the free part of the screen. */
    alignment: DialogTextAlignment;
}

/**
 * Full-size character "looks" standing behind the dialog text. The list is
 * right-to-left: persons[0] is the rightmost one; neighbours overlap slightly.
 * When the window's actor is on stage, the others are dimmed.
 */
const StagePersonsView: React.FC<StagePersonsViewProps> = ({ persons, alignment }) => {
    const storageProject = resolveImageProject(useProjectImages());
    if (persons.length === 0) return null;
    const someoneSpeaks = persons.some(p => p.speaking);

    return (
        <div
            className={`stage-persons stage-persons--${alignment}`}
            style={{ '--stage-count': persons.length } as React.CSSProperties}
            data-testid="stage-persons"
        >
            <AnimatePresence initial={false}>
                {persons.map((p, i) => (
                    <motion.div
                        key={`${i}-${p.char}`}
                        className={`stage-person${someoneSpeaks && !p.speaking ? ' stage-person--idle' : ''}`}
                        style={{ zIndex: p.speaking ? 10 : MAX_Z - i }}
                        data-testid={`stage-person-${p.char}`}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.img
                            key={p.image}
                            className="stage-person-img"
                            alt={p.name}
                            src={generateImageUrl(p.image, storageProject)}
                            draggable={false}
                            initial={{ opacity: 0.4 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25 }}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

const MAX_Z = 5;

export default StagePersonsView;
