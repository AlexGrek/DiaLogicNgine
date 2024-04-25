import React from 'react';
import { UiElementRenderView } from '../../exec/GameUiElementsProcessor';
import GameMeterUiElementView from './GameMeterUiElementView';

interface GameUiElementsViewProps {
    elements: UiElementRenderView[];
}

const GameUiElementsView: React.FC<GameUiElementsViewProps> = ({ elements }) => {
    return (
        <div className='game-ui-elements-container'>
            {elements.map((el) => {
                if (el.uiElementType == "meter")
                    return <GameMeterUiElementView meter={el} key={el.description.uid}/>
                return null
            })}
        </div>
    );
};

export default GameUiElementsView;
