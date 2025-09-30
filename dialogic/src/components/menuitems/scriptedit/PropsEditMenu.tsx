import React, { useState, useEffect } from 'react';
import { ButtonGroup, IconButton, Input, InputGroup, RadioTile, RadioTileGroup } from 'rsuite';
import { IUpds } from '../../../App';
import { Button, Stack, Table } from 'rsuite';
import ListIcon from '@rsuite/icons/List';
import OffIcon from '@rsuite/icons/Off';
import ParagraphIcon from '@rsuite/icons/Paragraph';
import NumbersIcon from '@rsuite/icons/Numbers';
import PlusIcon from '@rsuite/icons/Plus';
import GearIcon from '@rsuite/icons/Gear';
import ExploreIcon from '@rsuite/icons/Explore';
import TrashIcon from '@rsuite/icons/Trash';

import Prop, { createBoolProp, createLocationProp, createNumberProp, createStringProp, createVariantProp } from '../../../game/Prop';
import { isValidJsIdentifier } from '../../../Utils';
import lodash from 'lodash';
import PropsEditorDrawer from './PropsEditorDrawer';
import { GameDescription } from '../../../game/GameDescription';
import CopyButton from '../../common/copypaste/CopyButton';
import PasteButton from '../../common/copypaste/PasteButton';

interface PropsEditMenuProps {
    props: Prop[];
    game: GameDescription;
    onSetProps: (props: Prop[]) => void;
    handlers?: IUpds;
    creatable?: boolean
    visible?: boolean
}

const PropsEditMenu: React.FC<PropsEditMenuProps> = ({ props, onSetProps, game, handlers, creatable, visible }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [creatingNew, setCreatingNew] = useState<boolean>(false);
    const [createName, setCreateName] = useState<string>("")
    const [createTypeChange, setCreateTypeChange] = useState<string>("none");
    const [createMenuOpen, setCreateMenuOpen] = useState<boolean>(false);
    useEffect(() => {
        setEditingIndex(editingIndex);
    }, [editingIndex, props]);

    if (visible !== undefined && visible === false) {
        return <div />
    }

    const canCreate = creatable !== undefined ? creatable : true;

    const deleteProp = (id: number) => {
        const copy = lodash.cloneDeep(props)
        copy.splice(id, 1)
        onSetProps(copy)
    }

    const editProp = (id: number) => {
        setCreatingNew(false)
        setEditingIndex(id)
    }

    const updateProp = (index: number, value: Prop) => {
        const copy = lodash.cloneDeep(props)
        copy[index] = value
        onSetProps(copy)
    }

    const createProp = () => {
        const copy = lodash.cloneDeep(props)
        let create = null;
        switch (createTypeChange) {
            case "number":
                create = createNumberProp(createName, 0);
                break;
            case "string":
                create = createStringProp(createName, "");
                break;
            case "boolean":
                create = createBoolProp(createName, false)
                break;
            case "variant":
                create = createVariantProp(createName, ["default"], "default")
                break;
            case "location":
                create = createLocationProp(createName, "")
        }
        if (create) {
            copy.push(create)
            onSetProps(copy)
            editProp(copy.length - 1)
        }
    }

    const onPaste = (obj: any, typename: string, newUid?: string) => {
        const p = obj as Prop
        if (typename !== 'prop') {
            return
        }
        if (newUid === undefined) {
            return
        }
        const copy = lodash.cloneDeep(props)
        copy.push({ ...p, name: newUid })
        onSetProps(copy)
    }


    const convertTableRow = (p: Prop, i: number) => {
        const name = p.name
        const value = p.defaultValue
        return {
            "index": i,
            "name": name,
            "value": `${value}`,
            "type": p.datatype,
            "item": p
        }
    }

    const createTableData = () => {
        return props.map(convertTableRow)
    }

    const createMenu = () => {
        return <div>
            <InputGroup>
                <InputGroup.Addon> Name </InputGroup.Addon>
                <Input value={createName} placeholder="unique js identifier" onChange={setCreateName}></Input>
                <InputGroup.Button onClick={createProp} disabled={createTypeChange === "none" || !isValidJsIdentifier(createName)}><PlusIcon /></InputGroup.Button>
            </InputGroup>

            <RadioTileGroup defaultValue="blank" inline aria-label="Create new prop type" onChange={(val, ev) => setCreateTypeChange(val.toString())}>
                <RadioTile
                    icon={<NumbersIcon></NumbersIcon>}
                    label="Number"
                    value="number"
                >
                    any int or float

                </RadioTile>
                <RadioTile
                    icon={<ParagraphIcon />}
                    label="String"
                    value="string"
                >
                    any text
                </RadioTile>
                <RadioTile
                    icon={<OffIcon />}
                    label="Boolean"
                    value="boolean"
                >
                    true or false
                </RadioTile>
                <RadioTile
                    icon={<ListIcon />}
                    label="Variant"
                    value="variant"
                >
                    one of predefined string values
                </RadioTile>
                <RadioTile
                    icon={<ExploreIcon />}
                    label="Location"
                    value="location"
                >
                    location or none
                </RadioTile>
            </RadioTileGroup>
        </div>
    }

    const createOrPasteMenu = () => {
        const buttons = <Stack>
            <IconButton icon={<PlusIcon />} onClick={() => setCreateMenuOpen(!createMenuOpen)}>Create</IconButton>
            {handlers && <PasteButton requireNewUid onPasteClick={onPaste} handlers={handlers} typenames={['prop']} />}
        </Stack>
        return <div className="props-menu-buttons">
            {buttons}
            {createMenuOpen ? createMenu() : null}
        </div>
    }

    return (
        <div>
            {canCreate ? createOrPasteMenu() : null}
            <Table
                data={createTableData()}>
                <Table.Column width={35}>
                    <Table.HeaderCell>ID</Table.HeaderCell>
                    <Table.Cell dataKey="index" />
                </Table.Column>
                <Table.Column width={150}>
                    <Table.HeaderCell>Name</Table.HeaderCell>
                    <Table.Cell dataKey="name" />
                </Table.Column>
                <Table.Column width={150}>
                    <Table.HeaderCell>Data type</Table.HeaderCell>
                    <Table.Cell dataKey="type" />
                </Table.Column>
                <Table.Column width={150}>
                    <Table.HeaderCell>Default</Table.HeaderCell>
                    <Table.Cell dataKey="value" />
                </Table.Column>
                <Table.Column width={150}>
                    <Table.HeaderCell>Actions</Table.HeaderCell>
                    <Table.Cell style={{ padding: '6px' }}>
                        {rowData => (
                            <ButtonGroup>
                                <Button onClick={() => editProp(rowData.index)}>
                                    <GearIcon />
                                </Button>
                                <Button onClick={() => deleteProp(rowData.index)}>
                                    <TrashIcon />
                                </Button>
                                {handlers ? <CopyButton handlers={handlers} typename={'prop'} obj={rowData.item} buttonStyle='onlyIcon' /> : null}
                            </ButtonGroup>
                        )}
                    </Table.Cell>
                </Table.Column>
            </Table>
            {editingIndex >= 0 && props.length > editingIndex ? <PropsEditorDrawer game={game} value={props[editingIndex]} open={true} onUpdateProp={upd => updateProp(editingIndex, upd)} onClose={() => setEditingIndex(-1)} /> : null}
        </div>
    );
};

export default PropsEditMenu;
