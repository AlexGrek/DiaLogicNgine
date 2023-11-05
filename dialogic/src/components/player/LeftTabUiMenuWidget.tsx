import React, { ReactNode, useEffect, useState } from 'react';
import './LeftTabUiMenuWidget.css'

export interface DataGroup<T> {
    group: string,
    items: {
        label: string,
        value: string,
        data: T
    }[]
}

export type DataGroups<T> = DataGroup<T>[]

interface LeftTabUiMenuWidgetProps<T> {
    data: DataGroups<T>,
    detailsRenderer: (data: T) => ReactNode
    onSelected?: (selected: string) => void
}

const LeftTabUiMenuWidget: React.FC<LeftTabUiMenuWidgetProps<any>> = ({ data, detailsRenderer, onSelected }) => {
    const [chosenGroupIndex, setChosenGroupIndex] = useState<number | null>(null)
    const [chosenItemIndex, setChosenItemIndex] = useState<number | null>(null)

    useEffect(() => {
        setChosenGroupIndex(null)
        setChosenItemIndex(null)
    }, [data])

    const renderDetails = () => {
        if (chosenGroupIndex === null || chosenItemIndex === null) {
            return null
        }
        const item = data[chosenGroupIndex].items[chosenItemIndex]
        return detailsRenderer(item.data)
    }

    const  handleItemSelect = (groupIndex: number, idx: number) => {
        setChosenGroupIndex(groupIndex)
        setChosenItemIndex(idx)
    }

    const renderGroupItems = (groupIndex: number, items: { label: string; value: string; data: any; }[]) => {
        return items.map((item, idx) => {
            const add = (idx === chosenItemIndex && groupIndex === chosenGroupIndex) ? ' chosen' : ''
            const className = `left-tab-ui-menu-item${add}`
            return <p key={idx+groupIndex*1000} className={className} onClick={() => handleItemSelect(groupIndex, idx)}>
                {item.label}
            </p>
        })

    }

    const renderList = () => {
        const groups = data.map((grp, idx) => {
            return <div key={idx} className='left-tab-ui-menu-group'>
                <h3 className='left-tab-ui-menu-group-header'>{grp.group}</h3>
                <div className='left-tab-ui-menu-group-items'>
                    {renderGroupItems(idx, grp.items)}
                </div>
            </div>
        })
        return groups
    }

    return (
        <div className='left-tab-ui-menu-main-container'>
            <div className='left-tab-ui-menu-left'>
                {data.length > 0 && renderList()}
            </div>
            <div key={`${chosenItemIndex}${chosenGroupIndex}`} className='left-tab-ui-menu-details'>
                {renderDetails()}
            </div>
        </div>
    );
};

export default LeftTabUiMenuWidget;
