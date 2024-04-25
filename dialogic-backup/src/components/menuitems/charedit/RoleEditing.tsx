import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import Character, { Role } from '../../../game/Character';
import './charediting.css';
import CharRoleEditing from './CharRoleEditing';
import PropsEditMenu from '../scriptedit/PropsEditMenu';
import Prop from '../../../game/Prop';
import { Input, Panel, PanelGroup, Tag } from 'rsuite';
import TextListEditor from '../../common/text_list/TextListEditor';
import ConfirmDeleteButtonSmall from '../../common/ConfirmDeleteButtonSmall';

interface RoleEditingProps {
    game: GameDescription;
    role: Role
    onRoleChange: (r: Role) => void
    onDelete: (uid: string) => void
}

const RoleEditing: React.FC<RoleEditingProps> = ({ game, role, onRoleChange, onDelete }) => {
    const [ch, setCh] = useState<Role>(role);
    useEffect(() => {
        setCh(role);
    }, [role]);

    const save = () => {
        onRoleChange(ch)
    }

    const roleUsers = game.chars.filter(ch => ch.roles.includes(role.name))

    const renderDeleteButton = () => {
        return roleUsers.length === 0 ? <ConfirmDeleteButtonSmall onConfirm={() => onDelete(ch.name)}/> : null
    }

    const renderRoleUsers = () => {
        return roleUsers.map((user, i) => {
            return <Tag size="sm" key={i}>{user.displayName.main !== "" ? user.displayName.main : user.uid}</Tag>
        })
    }

    return (
        <div className='char-editing-main-container' onBlur={save}>
            <h3>{ch.name}</h3>
            {renderDeleteButton()}
            <div>{renderRoleUsers()}</div>
            <PanelGroup accordion bordered className='char-editing-main-menu'>
                <Panel header="Role props" defaultExpanded>
                    <PropsEditMenu game={game} props={ch.props} onSetProps={p => onRoleChange({ ...ch, props: p })} />
                </Panel>
                <Panel header="Display description">
                    <Input value={ch.description} onChange={s => setCh({...ch, description: s})}></Input>
                </Panel>
            </PanelGroup>
        </div>
    );
};

export default RoleEditing;
