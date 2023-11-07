import React from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import LeftTabUiMenuWidget, { DataGroups } from './LeftTabUiMenuWidget';
import { State } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import TabsUiMenuWidget from './TabsUiMenuWidget';
import { trace } from '../../Trace';
import { groupByProperty } from '../../Utils';
import { QuestRenderView, TaskRenderView } from '../../exec/RenderView';
import Markdown from 'react-markdown';
import './objectivestab.css'
import { ObjectiveStatus } from '../../exec/QuestProcessor';

interface objectivesTabProps {
    gameExecutor: GameExecManager;
    state: State;
    localmanager: LocalizationManager
}

const objectivesTab: React.FC<objectivesTabProps> = ({ gameExecutor, state, localmanager }) => {

    const getObjectives = (group: QuestRenderView[]): DataGroups<QuestRenderView> => {
        const groupedByName = groupByProperty(group, "questLineName")
        trace("Recreating QuestRenderView")
        const qlinesNames = Object.keys(groupedByName).filter(key => Object.hasOwn(groupedByName, key))
        const items = qlinesNames.map(qline => {
            const content = groupedByName[qline]
            return {
                group: qline,
                items: content.map(item => {
                    return {
                        label: item.name,
                        value: item.name,
                        data: item
                    }
                })
            }
        })
        return items
    }

    const renderIcon = (status: ObjectiveStatus) => {
        let icon = "Z"
        if (status === "failed") {
            icon = "Q"
        }
        if (status === "open") {
            icon = "V"
        }
        return <span className='objectives-tab-task-icon'>
            {icon}
        </span>
    }

    const renderTask = (t: TaskRenderView) => {
        return <p className='objectives-tab-renderer-item'>{renderIcon(t.status)}{t.name}</p>
    }

    const renderQuestDetails = (d: QuestRenderView) => {
        return <div className='objectives-tab-renderer'>
            <h2>{d.name}</h2>
            <div className='objectives-tab-renderer-items'>
                {d.tasks.map(renderTask)}
            </div>
        </div>
    }


    const objectivesTab = () => {
        const objectivesView = gameExecutor.renderer.renderProgress(state)

        return [{
            name: localmanager.local("Open"),
            contentRenderer: () => <LeftTabUiMenuWidget data={getObjectives(objectivesView.questsOpen)} detailsRenderer={renderQuestDetails} />
        },
        {
            name: localmanager.local("Completed"),
            contentRenderer: () => <LeftTabUiMenuWidget data={getObjectives(objectivesView.questsCompleted)} detailsRenderer={renderQuestDetails} />
        },
        {
            name: localmanager.local("Failed"),
            contentRenderer: () => <LeftTabUiMenuWidget data={getObjectives(objectivesView.questsFailed)} detailsRenderer={renderQuestDetails} />
        }
        ]
    }

    return (
        <TabsUiMenuWidget data={objectivesTab()} />
    );
};

export default objectivesTab;
