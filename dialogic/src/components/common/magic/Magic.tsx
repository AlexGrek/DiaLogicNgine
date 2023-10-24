import ArrowDownIcon from '@rsuite/icons/ArrowDown';
import ArrowRightIcon from '@rsuite/icons/ArrowRight';
import CreativeIcon from '@rsuite/icons/Creative';
import lodash from 'lodash';
import React, { ReactNode, useState } from 'react';
import { Button, Divider, Dropdown, Input, InputNumber, Modal } from 'rsuite';
import { isValidJsIdentifier } from '../../../Utils';
import { GameDescription } from '../../../game/GameDescription';


export interface MagicOperation {
    name: string
    parameters: { [key: string]: any }
    descr: string
    validator?: (op: MagicOperation) => string | null
    onApply: (op: MagicOperation) => string | null
}

interface MagicProps {
    operations: MagicOperation[]
    game?: GameDescription
}

const Magic: React.FC<MagicProps> = ({ operations, game }) => {
    const [errorText, setErrorText] = useState<string | null>(null)
    const [chosenOp, setChosenOp] = useState<MagicOperation | null>(null);

    const chooseOp = (op: MagicOperation) => {
        setChosenOp(lodash.cloneDeep(op))
    }

    const close = () => {
        setChosenOp(null)
        setErrorText(null)
    }

    const items = operations.map((op, i) => {
        const icon = op.parameters.length > 0 ? <ArrowDownIcon /> : <ArrowRightIcon />
        return <Dropdown.Item key={i} icon={icon} onSelect={() => chooseOp(op)}>{op.name}</Dropdown.Item>
    })

    const apply = (op: MagicOperation | null) => {
        const validator = op?.validator
        if (op !== null) {
            const onApply = op.onApply
            if (validator) {
                if (validator(op) === null) {
                    onApply(op)
                } else {
                    setErrorText(validator(op))
                }
            }
            const appliedResult = onApply(op)
            if (appliedResult !== null) {
                setErrorText(errorText)
                return // do not close the window
            }
        }
        close()
    }

    const generateParameters = (op: MagicOperation) => {
        const items = []
        for (let key in op.parameters) {
            if (op.parameters.hasOwnProperty(key)) {
                const value = op.parameters[key];
                var editor: ReactNode = null
                if (lodash.isString(value)) {
                    const validateAsUid = key.endsWith("id")
                    const canBeEmpty = key.includes("empty")
                    const onChange = (val: string) => {
                        const clone = lodash.cloneDeep(op)
                        clone.parameters[key] = val
                        setChosenOp(clone)
                        if (validateAsUid && !isValidJsIdentifier(val)) {
                            setErrorText(`Parameter ${key} should be valid JS identifier`)
                            return
                        }
                        if (val === "" && !canBeEmpty) {
                            setErrorText(`Parameter ${key} should not be empty`)
                            return
                        }
                        setErrorText(null)
                    }
                    editor = <Input value={value} onChange={(val => onChange(val))} />
                }
                if (lodash.isNumber(value)) {
                    const onChange = (val: string | number) => {
                        const clone = lodash.cloneDeep(op)
                        clone.parameters[key] = val
                        setChosenOp(clone)
                    }
                    editor = <InputNumber value={value} onChange={(val => onChange(val))} />
                }
                editor = <div>
                    <p>{key}: {editor}</p>
                </div>

                items.push(editor)
            }
        }
        return items
    }

    return (<div className='magic-main'>
        <Dropdown title="Magic" icon={<CreativeIcon />}>
            <Dropdown.Item panel style={{ padding: 10, width: 160 }}>
                <p>Quick edits</p>
            </Dropdown.Item>
            <Dropdown.Separator />
            {items}
        </Dropdown>
        <Modal open={chosenOp !== null} onClose={() => close()}>
            <Modal.Header>
                <Modal.Title>{chosenOp && chosenOp.name}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {errorText !== null ? <p className='magic-pop-error-text'>{errorText}</p> : null}
                {chosenOp && chosenOp.descr}
                <Divider />
                {chosenOp && generateParameters(chosenOp)}
            </Modal.Body>
            <Modal.Footer>
                <Button disabled={errorText !== null} onClick={() => chosenOp && apply(chosenOp)} appearance="primary">
                    Apply
                </Button>
                <Button onClick={() => close()} appearance="subtle">
                    Cancel
                </Button>
            </Modal.Footer>
        </Modal>
    </div>
    );
};

export default Magic;

