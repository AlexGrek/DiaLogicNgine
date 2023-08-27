import React, { ReactNode } from 'react';
import { Button, ButtonGroup, Tooltip, Whisper } from 'rsuite';

interface ButtonPanelSelectorProps<T> {
    chosen: T;
    variants: T[];
    buttonData?: ReactNode[] | string[] | undefined;
    onValueChanged: (a: T) => void;
    tooltips?: { [id: string]: string; };
}

function ButtonPanelSelector<T>(props: ButtonPanelSelectorProps<T>) {
    return (<ButtonGroup>{props.variants.map((el, i) => {
        const active = el === props.chosen
        const button = <Button key={i} active={active} onClick={() => props.onValueChanged(el)}>{props.buttonData ? props.buttonData[i] : String(el)}</Button>
        if (props.tooltips && props.tooltips[`${el}`]) {
            const tooltip = <Tooltip>{props.tooltips[`${el}`]}</Tooltip>
            return <Whisper key={i} placement="top" controlId="control-id-hover" trigger="hover" speaker={tooltip}>
                {button}
            </Whisper>
        } else {
            return button;
        }
    })}</ButtonGroup>
    );
};

export default ButtonPanelSelector;
