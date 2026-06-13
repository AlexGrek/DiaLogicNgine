import React, { useState, useEffect } from 'react';
import { AutoComplete, Button, Drawer, Input, InputNumber, Toggle } from 'rsuite';
import { GameDescription } from '../../../game/GameDescription';
import Prop from '../../../game/Prop';
import './propeditor.css'
import LocationPicker from '../../linkedit/LocationPicker';
import StringListEditor from '../../common/StringListEditor';

interface PropsEditorDrawerProps {
    value: Prop;
    open: boolean;
    onUpdateProp: (updates: Prop) => void;
    onClose: () => void;
    onlyDefault?: boolean;
    game: GameDescription
}

const PropsEditorDrawer: React.FC<PropsEditorDrawerProps> = ({ value, open, onUpdateProp, onClose, onlyDefault, game }) => {
    const [prop, setProp] = useState<Prop>(value);
    useEffect(() => {
        setProp(value);
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
        if (prop.datatype === "location") {
            return <div>
                <p>Default</p>
                <LocationPicker locs={game.locs}  value={prop.defaultValue} onLocChange={v => setProp({...prop, defaultValue: v || ''})}></LocationPicker>
            </div>
        }
        if (prop.datatype === "number") {
            const setNumber = (v: number | string | null) => {
                if (v === null) return
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
            const updateList = (variants: string[]) => {
                setProp({...prop, variants})
            }
            return <div className='prop-editor-long'>
                <p>Default value</p>
                <AutoComplete data={prop.variants}  value={prop.defaultValue} onChange={v => setProp({...prop, defaultValue: v})}/>
                <p>Variants</p>
                <StringListEditor value={prop.variants} onChange={updateList} editTextOnly={onlyDefault} />
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
                    {open && renderEditor()}
                </div>
            </Drawer.Body>
        </Drawer>
    );
};

export default PropsEditorDrawer;
