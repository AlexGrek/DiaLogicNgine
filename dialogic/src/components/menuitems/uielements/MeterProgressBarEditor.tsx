import React from 'react';
import { MeterProgressBar } from '../../../game/GameUiElementDescr';
import { Checkbox, InputNumber } from 'rsuite';

interface MeterProgressBarProps {
    progressBar: MeterProgressBar;
    onChange: (updatedProgressBar: MeterProgressBar) => void;
}

const MeterProgressBarEditor: React.FC<MeterProgressBarProps> = ({ progressBar, onChange }) => {
    const handleInputChange = (name: string) => (value: any) => {
        onChange({
            ...progressBar,
            [name]: parseFloat(value) // Ensure numeric values
        });
    };

    return (
        <div>
            <label>
                Max:
                <InputNumber
                    name="max"
                    value={progressBar.max}
                    onChange={handleInputChange("max")}
                />
            </label>
            <label>
                Min:
                <InputNumber
                    name="min"
                    value={progressBar.min}
                    onChange={handleInputChange("min")}
                />
            </label>
            <label>
                Use Colors:
                <Checkbox
                    name="colors"
                    checked={progressBar.colors}
                    onChange={() => onChange({...progressBar, colors: !progressBar.colors})}
                />
            </label>
            <div style={{display: progressBar.colors ? "block" : "none"}}>
            <label>
                Yellow Level:
                <InputNumber
                    name="yellowLevel"
                    value={progressBar.yellowLevel}
                    onChange={handleInputChange("yellowLevel")}
                />
            </label>
            <label>
                Red Level:
                <InputNumber
                    name="redLevel"
                    value={progressBar.redLevel}
                    onChange={handleInputChange("redLevel")}
                />
            </label>
            </div>
        </div>
    );
};

export default MeterProgressBarEditor;
