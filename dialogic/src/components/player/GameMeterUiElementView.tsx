import React from 'react';
import { UiElementMeterRenderView } from '../../exec/GameUiElementsProcessor';
import { MeterProgressBar } from '../../game/GameUiElementDescr';
import ProgressBar from './MicroProgressBar';

interface GameMeterUiElementViewProps {
    meter: UiElementMeterRenderView;
}
  

const GameMeterUiElementView: React.FC<GameMeterUiElementViewProps> = ({ meter }) => {
    const renderProgressBar = (bar: MeterProgressBar) => {
        return <ProgressBar min={bar.min} max={bar.max} current={meter.currentValue}></ProgressBar>
    }

    const renderPlainTextValue = () => {
        return meter.currentValue
    }

    return (
        <div className='game-ui-element-meter'>
            {meter.description.progressBar && renderProgressBar(meter.description.progressBar)}
            {meter.description.progressBar == null ? renderPlainTextValue() : null}
        </div>
    );
};

export default GameMeterUiElementView;
