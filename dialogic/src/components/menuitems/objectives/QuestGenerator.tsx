import React, { useState, useEffect } from 'react';
import QuestLine, { Quest, createQuest, createTask, createTaskByUid } from '../../../game/Objectives';
import { GameDescription } from '../../../game/GameDescription';
import { Button, ButtonGroup, Divider, IconButton, Input, InputGroup, Panel, Steps } from 'rsuite';
import PlusIcon from '@rsuite/icons/Plus';
import './quest.css'
import { generateUidFromName, isValidJsIdentifier } from '../../../Utils';
import StringListEditor from '../../common/StringListEditor';
import { toYaml } from '../../../Trace';

interface QuestGeneratorProps {
    questline: QuestLine;
    game: GameDescription;
    onCreateQuest: (q: Quest) => void
}

const QuestGenerator: React.FC<QuestGeneratorProps> = ({ questline, game, onCreateQuest }) => {
    const [questName, setQuestName] = useState<string>('')
    const [questId, setQuestId] = useState<string>('')
    const [questIdChanged, setQuestIdChanged] = useState<boolean>(false)
    const [genStep, setGenStep] = useState<number>(0)

    const [questTaskNames, setQuestTaskNames] = useState<string[]>([])
    const [questTaskIds, setQuestTaskIds] = useState<string[]>([])

    const [yamlText, setYamlText] = useState<string>('')

    useEffect(() => {

    }, [questline]);

    const toStep2 = () => {
        if (!isValidJsIdentifier(questId) || questName === '') {
            return
        }
        setGenStep(1)
    }

    const toStep3 = () => {
        setGenStep(2)
        const ids = questTaskNames.map(name => {
            return generateUidFromName(name)
        })
        setQuestTaskIds(ids)
    }

    const toStepFinal = () => {
        setGenStep(3)
        const quest = createQuest(questId)
        quest.name = questName
        const tasks = questTaskNames.map((taskName, index) => {
            const uid = questTaskIds[index]
            const task = createTaskByUid(uid, index)
            task.text = taskName
            return task
        })
        quest.tasks = tasks
        setYamlText(toYaml(quest))
    }

    const handleOnCreateQuest = () => {
        if (!isValidJsIdentifier(questId)) {
            return
        }
        const quest = createQuest(questId)
        quest.name = questName

        // cleanup
        setQuestId('')
        setQuestName('')
        setQuestIdChanged(false)
        setQuestTaskNames([])
        setGenStep(0)
        setQuestTaskIds([])
        setQuestTaskNames([])
        setYamlText('')

        onCreateQuest(quest)
    }

    const handleNameChange = (value: string) => {
        setQuestName(value)
        if (!questIdChanged) {
            // generate uid from name
            const id = generateUidFromName(value)
            setQuestId(id)
        }
    }

    const handleUidChange = (value: string) => {
        setQuestId(value)
        setQuestIdChanged(true)
    }

    const renderStep1 = () => {
        return <form>
            <div></div>
            <InputGroup>
                <InputGroup.Addon>Name</InputGroup.Addon><Input name='name' className='quest-create-uid-name' placeholder={`New quest name`} onPressEnter={handleOnCreateQuest} value={questName} onChange={handleNameChange} />
            </InputGroup>
            <InputGroup>
                <InputGroup.Addon>UID</InputGroup.Addon><Input name='uid' className='quest-create-uid-uid' style={{ fontFamily: "monospace" }} onPressEnter={handleOnCreateQuest} value={questId} onChange={handleUidChange} />
            </InputGroup>
            <div className='quest-gen-window-controls'>
                <IconButton name='submit' className='quest-gen-forward' style={{ display: "block", width: "100%" }} onClick={toStep2} icon={<PlusIcon />} disabled={!isValidJsIdentifier(questId)}>Configure tasks...</IconButton>
            </div></form>
    }

    const renderStep2 = () => {
        return <div className='quest-gen-editor-window'>
            <p>Describe quest tasks</p>
            <StringListEditor canBeEmpty value={questTaskNames} onChange={setQuestTaskNames} />
            <div className='quest-gen-window-controls'>
                <ButtonGroup>
                    <Button className='quest-gen-back' onClick={() => setGenStep(0)}>Back</Button>
                    <Button className='quest-gen-forward' onClick={() => toStep3()}>Next</Button>
                </ButtonGroup>
            </div>
        </div>
    }

    const renderStep3 = () => {
        return <div className='quest-gen-editor-window'>
            <p>Verify quest task IDs</p>
            <StringListEditor editTextOnly value={questTaskIds} onChange={setQuestTaskIds} />
            <div className='quest-gen-window-controls'>
                <ButtonGroup>
                    <Button className='quest-gen-back' onClick={() => setGenStep(1)}>Back</Button>
                    <Button className='quest-gen-forward' onClick={toStepFinal}>Finish</Button>
                </ButtonGroup>
            </div>
        </div>
    }

    const renderStepFinal = () => {
        return <div className='quest-gen-editor-window'>
            <p>Verify quest to be created</p>
            <Input as='textarea' value={yamlText} rows={3} onChange={setYamlText} className='yaml-textarea'/>
            <div className='quest-gen-window-controls'>
                <ButtonGroup>
                    <Button className='quest-gen-back' onClick={() => setGenStep(1)}>Back</Button>
                    <Button className='quest-gen-forward' onClick={handleOnCreateQuest}>Create quest</Button>
                </ButtonGroup>
            </div>
        </div>
    }

    return (
        <div className='quest-gen-container'>
            {genStep === 0 && renderStep1()}
            {genStep === 1 && renderStep2()}
            {genStep === 2 && renderStep3()}
            {genStep === 3 && renderStepFinal()}
            <Steps current={genStep}>
                <Steps.Item />
                <Steps.Item />
                <Steps.Item />
                <Steps.Item />
            </Steps>
        </div>
    );
};

export default QuestGenerator;
