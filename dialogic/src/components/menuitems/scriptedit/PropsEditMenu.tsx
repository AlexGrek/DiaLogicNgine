import React, { useState, useEffect } from 'react';
import { Input, InputGroup, RadioTile, RadioTileGroup } from 'rsuite';
import { IUpds } from '../../../App';
import { Button, Stack, Table } from 'rsuite';
import ListIcon from '@rsuite/icons/List';
import OffIcon from '@rsuite/icons/Off';
import ParagraphIcon from '@rsuite/icons/Paragraph';
import NumbersIcon from '@rsuite/icons/Numbers';
import Prop from '../../../game/Prop';

interface PropsEditMenuProps {
    props: Prop[];
    onSetProps: (props: Prop[]) => void;
    handlers?: IUpds;
}

const PropsEditMenu: React.FC<PropsEditMenuProps> = ({ props, onSetProps, handlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [creatingNew, setCreatingNew] = useState<boolean>(false);
    const [createName, setCreateName] = useState<string>("")
    useEffect(() => {
        setEditingIndex(editingIndex);
    }, [props]);

    const createPropsEditorTab = () => {
        return {
            header: "Props",
            content: <p>props tab!</p>
        }
    }

    const createPropssEditorTab = () => {
        return {
            header: "Propsing",
            content: <p>scripts tab!</p>
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
        <Stack>
            <Table
                height={400}
                data={createTableData()}>
                <Table.Column width={45}>
                    <Table.HeaderCell>ID</Table.HeaderCell>
                    <Table.Cell dataKey="index" />
                </Table.Column>
                <Table.Column width={150}>
                    <Table.HeaderCell>Name</Table.HeaderCell>
                    <Table.Cell dataKey="name" />
                </Table.Column>
                <Table.Column width={150}>
                    <Table.HeaderCell>Value</Table.HeaderCell>
                    <Table.Cell dataKey="value" />
                </Table.Column>
                <Table.Column width={150}>
                    <Table.HeaderCell>Data type</Table.HeaderCell>
                    <Table.Cell dataKey="type" />
                </Table.Column>
            </Table>
            <div>
                <InputGroup>
                <InputGroup.Addon> Name:</InputGroup.Addon>
                <Input value={createName} placeholder="unique js identifier" onChange={setCreateName}></Input>
                <InputGroup.Button></InputGroup.Button>
                </InputGroup>
                
                <RadioTileGroup defaultValue="blank" inline aria-label="Create new prop type">
                    <RadioTile
                        icon={<NumbersIcon></NumbersIcon>}
                        label="Number"
                        value="number"
                    >
                        any int or float

                    </RadioTile>
                    <RadioTile
                        icon={<ParagraphIcon/>}
                        label="String"
                        value="string"
                    >
                        any text
                    </RadioTile>
                    <RadioTile
                        icon={<OffIcon/>}
                        label="Boolean"
                        value="boolean"
                    >
                        true or false
                    </RadioTile>
                    <RadioTile
                        icon={<ListIcon/>}
                        label="Variant"
                        value="variant"
                    >
                        can contain one of the predefined string values
                    </RadioTile>
                </RadioTileGroup>
                <Button>Create</Button>

            </div>
        </Stack>
    );
};

export default PropsEditMenu;
