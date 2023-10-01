import React, { useState, useEffect } from 'react';
import { AutoComplete, Button, Col, Drawer, Grid, Input, InputNumber, Row, Toggle } from 'rsuite';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import Prop from '../../../game/Prop';
import './propeditor.css'

interface PropsEditorDrawerProps {
    value: Prop;
    open: boolean;
    onUpdateProp: (updates: Prop) => void;
    onClose: () => void;
    onlyDefault?: boolean
}

const PropsEditorDrawer: React.FC<PropsEditorDrawerProps> = ({ value, open, onUpdateProp, onClose, onlyDefault }) => {
    const [prop, setProp] = useState<Prop>(value);
    const [listOfVariantsAsString, setListOfVariantsAsString] = useState<string>("")
    useEffect(() => {
        setProp(value);
        if (prop.datatype === "variant") {
            setListOfVariantsAsString(prop.variants.join(","))
        }
    }, [value]);

    const onCloseHandler = (save: boolean) => {
        if (save) {
            onUpdateProp(prop)
        }
        onClose()
    }

    const renderEditor = () => {
        if (prop.datatype === "string") {
            return <div>
                <p>Default</p>
                <Input placeholder='default value' value={prop.defaultValue} onChange={v => setProp({...prop, defaultValue: v})}></Input>
            </div>
        }
        if (prop.datatype === "number") {
            const setNumber = (v: number | string) => {
                if (typeof(v) === "string") {
                    setProp({...prop, defaultValue: Number.parseFloat(v)})
                } else {
                    setProp({...prop, defaultValue: v})
                }
            }
            return <div>
                <p>Default</p>
                <InputNumber placeholder='default value' value={prop.defaultValue} onChange={setNumber}></InputNumber>
            </div>
        }
        if (prop.datatype === "boolean") {
            return <div>
                <p>Default value</p>
                <Toggle size="lg" checkedChildren="true" unCheckedChildren="false" checked={prop.defaultValue} onChange={v => setProp({...prop, defaultValue: v})}/>
            </div>
        }
        if (prop.datatype === "variant") {
            const updateList = (listAsCommaSepStr: string) => {
                const decoded = listAsCommaSepStr.split(",")
                setProp({...prop, variants: decoded})
                setListOfVariantsAsString(listAsCommaSepStr)
            }
            return <div className='prop-editor-long'>
                <p>Default value</p>
                <AutoComplete data={prop.variants}  value={prop.defaultValue} onChange={v => setProp({...prop, defaultValue: v})}/>
                <p>Variants</p>
                <Input readOnly={onlyDefault} placeholder='comma-separated list of values' value={listOfVariantsAsString} onChange={updateList}></Input>
                <p className='prop-editor-tip'>Comma-separated values. Example: <code>a,b,c</code></p>
            </div>
        }
    }

    return (
        <Drawer size="sm" placement="bottom" open={open} onClose={() => onCloseHandler(true)}>
            <Drawer.Header>
                <Drawer.Title>{prop.name}</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => onCloseHandler(false)} appearance="ghost" color="blue">
                        Discard
                    </Button>
                    <Button onClick={() => onCloseHandler(true)} appearance="primary">
                        Save
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                <div className="prop-editor-drawer-content">
                    {renderEditor()}
                </div>
            </Drawer.Body>
        </Drawer>
    );
};

export default PropsEditorDrawer;
