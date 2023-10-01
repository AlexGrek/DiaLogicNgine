import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import Character, { Role } from '../../../game/Character';
import './charediting.css';
import CharRoleEditing from './CharRoleEditing';
import PropsEditMenu from '../scriptedit/PropsEditMenu';
import Prop from '../../../game/Prop';
import { Input, Panel, PanelGroup } from 'rsuite';
import TextListEditor from '../../common/text_list/TextListEditor';

interface RoleEditingProps {
    game: GameDescription;
    role: Role
    onRoleChange: (r: Role) => void
}

const RoleEditing: React.FC<RoleEditingProps> = ({ game, role, onRoleChange }) => {
    const [ch, setCh] = useState<Role>(role);
    useEffect(() => {
        setCh(role);
    }, [role]);

    const save = () => {
        onRoleChange(ch)
    }

    return (
        <div className='char-editing-main-container' onBlur={save}>
            <h3>{ch.name}</h3>
            <PanelGroup accordion bordered className='char-editing-main-menu'>
                <Panel header="Role props" defaultExpanded>
                    <PropsEditMenu props={ch.props} onSetProps={p => onRoleChange({ ...ch, props: p })} />
                </Panel>
                <Panel header="Display description">
                    <Input value={ch.description} onChange={s => setCh({...ch, description: s})}></Input>
                </Panel>
            </PanelGroup>
        </div>
    );
};

export default RoleEditing;
