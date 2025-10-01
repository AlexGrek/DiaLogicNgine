import React, { useState, useEffect } from 'react';
import { Dropdown, IconButton, Input, InputGroup } from 'rsuite';
import { generateUidFromName, isValidJsIdentifier } from '../../Utils';
import PlusIcon from '@rsuite/icons/Plus';

interface CreateWithUidProps {
    objectName: string;
    onCreate: (data: CreationData) => void
    initialName?: string
    initialUid?: string
    id?: string
    className?: string
    uidPrefix?: string
}

export interface CreationData {
    uid: string
    name: string
}

const CreateWithUid: React.FC<CreateWithUidProps> = ({ objectName, initialName, initialUid, onCreate, id, className, uidPrefix }) => {
    const [creationData, setCreationData] = useState<CreationData>({ name: initialName || "", uid: initialUid || "" });
    const [userChangedUid, setUserChangedUid] = useState<boolean>(false)

    useEffect(() => {
        setCreationData({ name: initialName || "", uid: initialUid || "" });
        setUserChangedUid(false)
    }, [objectName, initialName, initialUid]);

    const handleCreate = () => {
        if (isValidJsIdentifier(creationData.uid)) {
            onCreate(creationData)
            setUserChangedUid(false)
            setCreationData({ name: initialName || "", uid: initialUid || "" })
        }
    }

    const handleNameChange = (value: string) => {
        if (!userChangedUid) {
            // generate uid from name
            const id = generateUidFromName(value)
            setCreationData({ name: value, uid: id })
        }
        else {
            setCreationData({ ...creationData, name: value })
        }
    }

    const handleUidChange = (value: string) => {
        setCreationData({ ...creationData, uid: value })
        setUserChangedUid(true)
    }

    return (
        <Dropdown title="Create" className={'create-uid-dropdown ' + className || ''} id={id ? id : `create-uid-${objectName}`}>
            <Dropdown.Item panel style={{ padding: '4pt 10pt', width: 280 }}>
                <form>
                    <InputGroup>
                        <InputGroup.Addon>Name</InputGroup.Addon><Input name='name' className='create-uid-name' placeholder={`${objectName} name`} onPressEnter={() => handleCreate()} value={creationData.name} onChange={handleNameChange} />
                    </InputGroup>
                    <InputGroup>
                        <InputGroup.Addon>{uidPrefix || 'UID'}</InputGroup.Addon><Input name='uid' className='create-uid-uid' style={{ fontFamily: "monospace" }} onPressEnter={() => handleCreate()} value={creationData.uid} onChange={handleUidChange} />
                    </InputGroup>
                    <IconButton name='submit' className='create-uid-button' style={{ display: "block", width: "100%" }} onClick={() => handleCreate()} icon={<PlusIcon />} disabled={!isValidJsIdentifier(creationData.uid)}>Create {objectName}</IconButton>
                </form>
            </Dropdown.Item>
        </Dropdown>
    );
};

export default CreateWithUid;
