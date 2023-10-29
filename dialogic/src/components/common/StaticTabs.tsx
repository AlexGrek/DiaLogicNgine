import { open } from 'fs/promises';
import React, { useState, useEffect } from 'react';
import { Nav } from 'rsuite';

export interface StaticTab {
    header: string;
    content?: React.ReactNode
    disabled?: boolean
}

interface StaticTabsProps {
    tabs: StaticTab[];
    keepOpen?: boolean
}

const StaticTabs: React.FC<StaticTabsProps> = ({ tabs, keepOpen }) => {
    const [openTabIndex, setOpenTab] = useState<number>(0);
    // useEffect(() => {
    //     setOpenTab(0);
    // }, [tabs]);

    const prepareTabs = (tb: StaticTab[]) => {
        return tb.map((tab, i) => {
            return <Nav.Item disabled={tab.disabled} eventKey={i.toString()}>{tab.header}</Nav.Item>
        })
    }

    const changeTab = (upd: string) => {
        const intvalue = Number.parseInt(upd)
        setOpenTab(intvalue)
    }

    const renderContentSingleTab = () => {
        if (tabs.length === 0) {
            return <div><p><mark>ERROR: no tabs to render</mark></p></div>
        }
        if (openTabIndex < 0 || openTabIndex > tabs.length - 1) {
            return <div><p><mark>ERROR: cannot open tab {openTabIndex.toString()}</mark></p></div>
        }
        if (tabs[openTabIndex].content) {
            return <div className='static-tabs-tab' data-tab-index={openTabIndex}>{tabs[openTabIndex].content}</div>
        } else {
            return <div></div>
        }
    }

    const renderContentAllTabs = () => {
        if (tabs.length === 0) {
            return <div><p><mark>ERROR: no tabs to render</mark></p></div>
        }
        if (openTabIndex < 0 || openTabIndex > tabs.length - 1) {
            return <div><p><mark>ERROR: cannot open tab {openTabIndex.toString()}</mark></p></div>
        }
        return tabs.map((tab, index) => {
            const visible = index === openTabIndex
            if (tab.content) {
                return <div key={index} style={{ display: visible ? "block" : "none" }}>{tabs[openTabIndex].content}</div>
            } else {
                return <div key={index} style={{ display: visible ? "block" : "none" }}></div>
            }
        })
    }

    return (
        <div className='static-tabs'>
            <Nav appearance='subtle' activeKey={openTabIndex.toString()} onSelect={changeTab}>
                {prepareTabs(tabs)}
            </Nav>
            <div className='static-tabs-tab-container'>{keepOpen ? renderContentSingleTab() : renderContentSingleTab()}
            </div>
        </div>
    );
};

export default StaticTabs;
