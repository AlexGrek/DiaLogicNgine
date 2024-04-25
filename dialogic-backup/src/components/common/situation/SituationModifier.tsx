import React from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import { InputPicker } from 'rsuite';
import { trace } from '../../../Trace';

interface SituationModifierProps {
    value: string | null;
    onChange: (upd: string | null) => void
    game: GameDescription
    handlers: IUpds
}

const SituationModifier: React.FC<SituationModifierProps> = ({ value, onChange, game, handlers }) => {
    const data = game.situations.map(item => {
        return { label: item, value: item }
    })

    const handleChange = (value: string) => {
        trace(`Change value: ${value}`)
        onChange(value != '' ? value : null)
    } 

    return (
        <div><span className='editor-label'>Change situation</span><InputPicker
            creatable
            data={data}
            style={{ minWidth: '10em' }}
            value={value}
            onCreate={(value, _item) => {
                handlers.createSituation(value)
            }}
            onChange={handleChange}
        /></div>
    );
};

export default SituationModifier;
