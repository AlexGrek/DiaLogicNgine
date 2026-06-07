import React, { useState } from 'react';
import { Nav } from 'rsuite';
import './PillLikeTabs.css';

export interface PillTab {
    header: string;
    content?: React.ReactNode;
    disabled?: boolean;
}

interface PillLikeTabsProps {
    tabs: PillTab[];
}

const PillLikeTabs: React.FC<PillLikeTabsProps> = ({ tabs }) => {
    const [activeIndex, setActiveIndex] = useState<number>(0);

    return (
        <div className="pill-tabs" data-testid="pill-tabs">
            <div className="pill-tabs-nav">
                <Nav
                    appearance="subtle"
                    activeKey={activeIndex.toString()}
                    onSelect={(key) => setActiveIndex(Number(key))}
                >
                    {tabs.map((tab, i) => (
                        <Nav.Item key={i} eventKey={i.toString()} disabled={tab.disabled}>
                            {tab.header}
                        </Nav.Item>
                    ))}
                </Nav>
            </div>
            <div className="pill-tabs-content">
                {tabs[activeIndex]?.content ?? null}
            </div>
        </div>
    );
};

export default PillLikeTabs;
