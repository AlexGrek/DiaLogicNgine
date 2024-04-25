import React from 'react';
import './InGameControlPad.css'
import screenfull from 'screenfull';
import { UiElementMeterRenderView } from '../../exec/GameUiElementsProcessor';

interface InGameControlPadProps {
    onFullscreen: Function;
    uiElements: UiElementMeterRenderView[]
}

const InGameControlPad: React.FC<InGameControlPadProps> = ({ onFullscreen }) => {

    const fullScreenToggle = () => {
        if (screenfull.isEnabled) {
            if (screenfull.isFullscreen) {
                screenfull.exit();
            }
            else
                screenfull.request();
        }
        onFullscreen();
    }

    return (
        <div className="ingame-control-panel">
          <button className="ingame-control-button" onClick={() => fullScreenToggle()}>&#57358;</button>
        </div>
    );
};

export default InGameControlPad;
