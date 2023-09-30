import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { IUpds } from '../../../App';
import UserBadgeIcon from '@rsuite/icons/UserBadge';
import PlusIcon from '@rsuite/icons/Plus';
import { Button, Col, Dropdown, Input, InputGroup, Nav, Notification } from 'rsuite';
import lodash from 'lodash';
import Character, { Role, createEmptyRole } from '../../../game/Character';
import { isValidJsIdentifier } from '../../../Utils';
import './charmenu.css'
import RoleEditing from './RoleEditing';

interface RolesMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
}

const RolesMenu: React.FC<RolesMenuProps> = ({ game, onSetGame, handlers: IUpds }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [creatingUID, setCreatingUID] = useState<string>("");

    const roles = game.roles

    const navItems = () => {
        return roles.map((item, i) => {
            return <Nav.Item key={i} eventKey={i.toString()} icon={<UserBadgeIcon />}>{item.name}</Nav.Item>
        })
    }

    const updateRoles = (chars: Role[]) => {
        onSetGame({ ...game, roles: chars })
    }

    const createRole = () => {
        const name = creatingUID
        setCreatingUID("")
        const copy = lodash.cloneDeep(roles)
        copy.push(createEmptyRole(name))
        updateRoles(copy)
    }

    const onSelectTab = (selected: string) => {
        const editingIndex = Number.parseInt(selected)
        if (!lodash.isNaN(editingIndex) && editingIndex >= 0 && editingIndex < roles.length) {
            setEditingIndex(editingIndex)
        }
    }

    const setRole = (i: number, value: Role) => {
        const copy = lodash.cloneDeep(roles)
        copy[i] = value
        updateRoles(copy)
    }

    const tab = (i: number) => {
        const char = roles[i]
        return <RoleEditing game={game} role={char} onRoleChange={value => setRole(i, value)}></RoleEditing>
    }

    return (
        <div>
            <div className='char-menu-top-panel'>
                <Notification closable style={{ height: 70 }}>
                    Create a role for NPCs that contain properties and functions, that can be used by NPCs, and can be overriden by NPCs
                </Notification>
            </div>
            <div className='char-menu-tab-host'>
                <div className='char-menu-tab-navi'>
                    <Dropdown title="Create">
                        <Dropdown.Item panel style={{ padding: 10, width: 280 }}>
                            <InputGroup>
                                <InputGroup.Addon>UID:</InputGroup.Addon><Input onPressEnter={() => createRole} value={creatingUID} onChange={setCreatingUID}></Input>
                                <InputGroup.Button onClick={() => createRole()} disabled={!isValidJsIdentifier(creatingUID)}><PlusIcon /></InputGroup.Button>
                            </InputGroup>
                        </Dropdown.Item>
                    </Dropdown>
                    <Nav vertical appearance="tabs" activeKey={editingIndex.toString()} onSelect={onSelectTab}>
                        {navItems()}
                    </Nav>
                </div>
                <div className='char-menu-tab-editor'>
                    {editingIndex >= 0 ? tab(editingIndex) : null}
                </div>
            </div>
        </div>

    );
};

export default RolesMenu;
