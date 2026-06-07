import React from 'react';
import { UiElementMeterRenderView } from '../../exec/GameUiElementsProcessor';
import { MeterProgressBar } from '../../game/GameUiElementDescr';
import { isFontId, resolveFontCss } from '../../lib/fonts';
import IconSvg from '../common/IconSvg';
import ProgressBar from './MicroProgressBar';

interface GameMeterUiElementViewProps {
    meter: UiElementMeterRenderView;
}

const GameMeterUiElementView: React.FC<GameMeterUiElementViewProps> = ({ meter }) => {
    const currentNumber = typeof meter.currentValue === 'number'
        ? meter.currentValue
        : parseFloat(String(meter.currentValue))

    const renderProgressBar = (bar: MeterProgressBar) => {
        return (
            <ProgressBar
                min={bar.min}
                max={bar.max}
                current={currentNumber}
                foregroundColor={meter.description.color ?? 'white'}
            />
        );
    }

    const renderPlainTextValue = () => {
        return (
            <span style={meter.description.color ? { color: meter.description.color } : undefined}>
                {meter.currentValue}
            </span>
        );
    }

    const meterFont = meter.description.fontId && isFontId(meter.description.fontId)
        ? resolveFontCss(meter.description.fontId)
        : undefined

    const meterStyle: React.CSSProperties = {
        opacity: meter.description.layout.opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        ...(meterFont ? { fontFamily: meterFont } : {}),
    }

    return (
        <div className='game-ui-element-meter' style={meterStyle}>
            {meter.description.iconId && (
                <IconSvg iconId={meter.description.iconId} size={16} />
            )}
            {meter.description.progressBar && renderProgressBar(meter.description.progressBar)}
            {meter.description.progressBar == null ? renderPlainTextValue() : null}
        </div>
    );
};

export default GameMeterUiElementView;
