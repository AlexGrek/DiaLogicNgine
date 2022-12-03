import React, { ReactNode } from 'react';
import { Button, ButtonGroup } from 'rsuite';
import { JsxElement } from 'typescript';

interface ButtonPanelSelectorProps<T> {
    chosen: T;
    variants: T[];
    buttonData?: ReactNode[] | string[] | undefined;
    onValueChanged: (a: T) => void;
}

function ButtonPanelSelector<T>(props: ButtonPanelSelectorProps<T>) {
    return (<ButtonGroup>{props.variants.map((el, i) => {
        const active = el === props.chosen
        return <Button active={active} onClick={() => props.onValueChanged(el)}>{props.buttonData? props.buttonData[i] : String(el)}</Button>
    })}</ButtonGroup>
    );
};

export default ButtonPanelSelector;
