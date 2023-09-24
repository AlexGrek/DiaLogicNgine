import React from 'react';
import './InGameControlPad.css'
import screenfull from 'screenfull';

interface InGameControlPadProps {
    onFullscreen: Function;
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
    }

    return (
        <div className="ingame-control-panel">
          <button className="ingame-control-button" onClick={() => fullScreenToggle()}>&#57358;</button>  
        </div>
    );
};

export default InGameControlPad;
