import React, { useState, useEffect } from 'react';
import { ButtonGroup, Input, InputGroup, RadioTile, RadioTileGroup } from 'rsuite';
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

interface PropsEditMenuProps {
    props: Prop[];
    onSetProps: (props: Prop[]) => void;
    game: GameDescription
    handlers?: IUpds;
}

const PropsEditMenu: React.FC<PropsEditMenuProps> = ({ props, onSetProps, game, handlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [creatingNew, setCreatingNew] = useState<boolean>(false);
    const [createName, setCreateName] = useState<string>("")
    const [createTypeChange, setCreateTypeChange] = useState<string>("none");
    useEffect(() => {
        setEditingIndex(editingIndex);
    }, [props]);

    const deleteProp = (id: number) => {
        const copy = lodash.cloneDeep(props)
        console.log(`Delete prop ${id} of ${JSON.stringify(props)} total ${props.length}`)
        copy.splice(id, 1)
        onSetProps(copy)
    }

    const editProp = (id: number) => {
        console.log(`Editing prop ${id} of ${JSON.stringify(props)} total ${props.length}`)
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
        var create = null;
        switch (createTypeChange) {
            case "numeric":
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
            console.log(`Creating prop ${copy.length - 1} of ${JSON.stringify(copy)} total ${copy.length}`)
            editProp(copy.length - 1)
        }
    }


    const convertTableRow = (p: Prop, i: number) => {
        const name = p.name
        const value = p.defaultValue
        return {
            "index": i,
            "name": name,
            "value": `${value}`,
            "type": p.datatype
        }
    }

    const createTableData = () => {
        return props.map(convertTableRow)
    }

    return (
        <div>
            <div>
                <InputGroup>
                    <InputGroup.Addon> Name </InputGroup.Addon>
                    <Input value={createName} placeholder="unique js identifier" onChange={setCreateName}></Input>
                    <InputGroup.Button onClick={createProp} disabled={createTypeChange === "none" || !isValidJsIdentifier(createName)}><PlusIcon /></InputGroup.Button>
                </InputGroup>

                <RadioTileGroup defaultValue="blank" inline aria-label="Create new prop type" onChange={(val, ev) => setCreateTypeChange(val.toString())}>
                    <RadioTile
                        icon={<NumbersIcon></NumbersIcon>}
                        label="Number"
                        value="numeric"
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
                        can contain one of the predefined string values
                    </RadioTile>
                    <RadioTile
                        icon={<ExploreIcon />}
                        label="Location"
                        value="location"
                    >
                        can contain location
                    </RadioTile>
                </RadioTileGroup>
            </div>
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
