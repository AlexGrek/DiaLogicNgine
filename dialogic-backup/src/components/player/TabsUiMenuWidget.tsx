import React, { ReactNode, useEffect, useState } from 'react';
import './TabsUiMenuWidget.css'

export interface TabData {
    name: string
    disabled?: boolean
    contentRenderer: () => ReactNode
}

interface TabsUiMenuWidgetProps<T> {
    data: TabData[],
}

const TabsUiMenuWidget: React.FC<TabsUiMenuWidgetProps<any>> = ({ data }) => {
    const [chosenItemIndex, setChosenItemIndex] = useState<number>(0)

    useEffect(() => {
        setChosenItemIndex(0)
    }, [data])

    const handleItemSelect = (idx: number) => {
        setChosenItemIndex(idx)
    }

    const renderGroupItems = (items: TabData[]) => {
        return items.map((item, idx) => {
            const add = idx === chosenItemIndex ? ' chosen' : ''
            const className = `tab-ui-menu-item${add}`
            return <p key={idx} className={className} onClick={() => handleItemSelect(idx)}>
                {item.name}
            </p>
        })
    }

    return (
        <div className='tab-ui-menu-main-container'>
            <div className='tab-ui-menu-top'>
                {data.length > 0 && renderGroupItems(data)}
            </div>
            <div key={chosenItemIndex} className='tab-ui-menu-content'>
                {(data.length > 0 && chosenItemIndex < data.length) && data[chosenItemIndex].contentRenderer()}
            </div>
        </div>
    );
};

export default TabsUiMenuWidget;
