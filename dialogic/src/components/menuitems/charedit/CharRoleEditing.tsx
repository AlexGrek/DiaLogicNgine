import React, { useState, useEffect, CSSProperties } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import Character, { Role, roleByUid } from '../../../game/Character';
import './charediting.css';
import { Button, ButtonGroup, InputPicker, Panel, PanelGroup, Table } from 'rsuite';
import TextListEditor from '../../common/text_list/TextListEditor';
import Prop, { createBoolProp } from '../../../game/Prop';
import lodash from 'lodash';
import PropsEditorDrawer from '../scriptedit/PropsEditorDrawer';

interface CharRoleEditingProps {
    game: GameDescription;
    char: Character
    onCharacterChange: (char: Character) => void
}

const fullscreenEditingStyle = {
    transform: `translate(0px, -60px)`, opacity: 1,
    transitionProperty: "transform width",
    width: "90%",
    height: "80%",
    display: "block"
}

const CharRoleEditing: React.FC<CharRoleEditingProps> = ({ game, char, onCharacterChange }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1)
    const [editingStyle, setEditingStyle] = useState<CSSProperties>({})
    const [defaultValueEditing, setDefaultValueEditing] = useState<Prop | null>(null)

    const addRole = (uid: string) => {
        const update = {
            ...char,
            roles: [...char.roles, uid]
        }
        onCharacterChange(update)
    }

    const removeRoleAndOverrides = (role: Role) => {
        console.log("Removing the following role: " + JSON.stringify(role))
        setEditingIndex(-1)
        const propsCopy = lodash.cloneDeep(char.overrideProps)
        const rolesCopy = lodash.cloneDeep(char.roles)
        const removeRoleIndex = rolesCopy.indexOf(role.name)
        rolesCopy.splice(removeRoleIndex, 1)

        const propsToAvoid = role.props.map(prop => prop.name)
        const propsCopyFiltered = propsCopy.filter(prop => !propsToAvoid.includes(prop.name))
        const update = {
            ...char,
            roles: rolesCopy,
            overrideProps: propsCopyFiltered
        }
        onCharacterChange(update)
    }

    const rolesAppliedUids = char.roles

    const rolesApplied = rolesAppliedUids.map(role => roleByUid(role, game))

    const rolesNotApplied = game.roles.filter(r => !char.roles.includes(r.name))

    const rolesNotAppliedUids = rolesNotApplied.map(r => r.name)

    const dataForNewRoleAdd = rolesNotAppliedUids.map(ruid => {
        return { label: ruid, value: ruid }
    })

    const getOverridden = (propid: string) => {
        return char.overrideProps.find(prop => prop.name === propid)
    }

    const overrideProp = (prop: Prop) => {
        const propCopy = lodash.cloneDeep(prop)
        const update = {
            ...char,
            overrideProps: [...char.overrideProps, propCopy]
        }
        onCharacterChange(update)
    }

    const unOverrideProp = (propid: string) => {
        const propsCopy = lodash.cloneDeep(char.overrideProps)
        const toRemoveIndex = propsCopy.findIndex(p => p.name === propid)
        if (toRemoveIndex < 0) {
            console.error("Cannot unOverride prop, not found by name: " + propid)
        }
        propsCopy.splice(toRemoveIndex, 1)
        const update = {
            ...char,
            overrideProps: propsCopy
        }
        onCharacterChange(update)
    }

    const roleSelected = (e: React.MouseEvent, i: number) => {
        const target = e.currentTarget
        const parent = target.parentElement
        const pnode = target.parentNode

        const rect = target.getBoundingClientRect()

        const rectp = parent?.getBoundingClientRect()

        if (rectp === undefined) {
            return
        }

        setEditingIndex(i)
        const left = Math.round(rect.left - rectp.left)
        const top = Math.round(rect.top - rectp.top)
        setEditingStyle({
            transform: `translate(${left}px, ${top}px)`, opacity: 0.8,
            transitionProperty: "", width: "230px", height: "100px",
            display: "block"
        })
        setTimeout(() => setEditingStyle(fullscreenEditingStyle), 10)

        // console.log(`left ${target.clientLeft} height ${target.clientHeight} top ${target.clientTop} width ${target.clientWidth}`)
        // console.log(`offsetTop ${target.parentElement?.offsetTop} offsetLeft ${target.parentElement?.offsetLeft} offsetHeight ${target.parentElement?.offsetHeight} offsetwidth ${target.parentElement?.offsetWidth}`)
    }

    const createTableData = (r: Role, char: Character) => {
        return r.props.map((el, i) => {
            const overridden = getOverridden(el.name)
            const value = overridden !== undefined ? overridden.defaultValue : el.defaultValue
            return {name: el.name, index: i, defaultValue: value.toString(), prop: el, overridden: overridden !== undefined, override: overridden }
        })
    }

    const openDefaultValueEditor = (prop: Prop) => {
        setDefaultValueEditing(prop)
    }

    const onChangeDefaultValue = (prop: Prop) => {
        const propid = prop.name
        const propsCopy = lodash.cloneDeep(char.overrideProps)
        const index = propsCopy.findIndex(p => p.name === propid)
        if (index < 0) {
            console.error("Cannot edit prop, not found by name: " + propid)
        }
        propsCopy[index] = prop
        const update = {
            ...char,
            overrideProps: propsCopy
        }
        onCharacterChange(update)
    }

    const renderRedefinitionManager = (r: Role, char: Character) => {
        return <Table
        data={createTableData(r, char)}>
        <Table.Column width={200}>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.Cell dataKey="name" />
        </Table.Column>
        <Table.Column width={200}>
            <Table.HeaderCell>Value</Table.HeaderCell>
            <Table.Cell dataKey="defaultValue" />
        </Table.Column>
        <Table.Column width={350}>
            <Table.HeaderCell>Actions</Table.HeaderCell>
            <Table.Cell style={{ padding: '6px' }}>
                {rowData => (
                    <ButtonGroup>
                    <Button disabled={rowData.overridden} appearance="link" onClick={() => overrideProp(rowData.prop)}>
                         override
                    </Button>
                    <Button disabled={!rowData.overridden} appearance="link" onClick={() => unOverrideProp(rowData.prop.name)}>
                         reset
                    </Button>
                    <Button disabled={!rowData.overridden} appearance="link" onClick={() => openDefaultValueEditor(rowData.override ? rowData.override : rowData.prop)}>
                         set
                    </Button>
                    </ButtonGroup>
                )}
            </Table.Cell>
        </Table.Column>
    </Table>
    }

    const renderAppliedRoleEditor = (i: number) => {
        const role = rolesApplied[i]
        if (role === undefined) {
            return <div style={{ display: "none" }}></div>
        }
        return <div className='applied-role-editor' style={editingIndex < 0 ? undefined : editingStyle}>
            <div className="applied-role-header">
                <p>{role.name}</p>
                <Button appearance="ghost" onClick={(e) => {
                    setEditingIndex(-1);
                    e.stopPropagation();
                }}>Save</Button>
            </div>
            <div>
                <Button appearance="link" color="red" onClick={() => removeRoleAndOverrides(role)}>Unassign role</Button>
            </div>
            <div className='applied-role-content'>
                {renderRedefinitionManager(role, char)}
            </div>
        </div>
    }

    const renderAppliedRole = (role: Role | undefined, index: number) => {
        if (role === undefined) {
            return <div></div>
        }
        return <div key={role.name} style={{ opacity: editingIndex < 0 ? 1 : 0.1 }} className='applied-role-item' onClick={e => roleSelected(e, index)}>
            {role.name}
        </div>
    }

    return (
        <div className='char-role-editing'>
            <div className='char-role-add'>
                <InputPicker size="lg" placeholder="Assign role" data={dataForNewRoleAdd} onChange={addRole} />
            </div>
            <div className='char-role-display'>
                {renderAppliedRoleEditor(editingIndex)}
                <div className='char-role-applied-container'>
                    {rolesApplied.map((role, i) => renderAppliedRole(role, i))}
                </div>
            </div>
            <PropsEditorDrawer value={defaultValueEditing || createBoolProp("placeholder", false)} open={defaultValueEditing !== null} onUpdateProp={onChangeDefaultValue} onClose={() => setDefaultValueEditing(null)}/>
        </div>
    );
};

export default CharRoleEditing;
