import React, { useState, useEffect } from 'react';
import { RadioTile, RadioTileGroup } from 'rsuite';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import { Button, Stack, Table } from 'rsuite';
import StaticTabs from '../../common/StaticTabs';
import Prop from '../../../game/Prop';

interface PropsEditMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const PropsEditMenu: React.FC<PropsEditMenuProps> = ({ game, onSetGame, handlers }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [creatingNew, setCreatingNew] = useState<boolean>(false);
    useEffect(() => {
        setEditingIndex(editingIndex);
    }, [game]);

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
        const props = game.props
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
                    <Button>Create</Button>
                    
                </div>
        </Stack>
    );
};

export default PropsEditMenu;
