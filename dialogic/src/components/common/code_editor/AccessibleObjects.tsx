import React, { useState, useEffect } from 'react';
import TreeView, { flattenTree } from "react-accessible-treeview";
import ArrowRightIcon from '@rsuite/icons/ArrowRight';
import ArrowDownIcon from '@rsuite/icons/ArrowDown';
import { Tooltip, Whisper } from 'rsuite';
import { IconFunction, IconVariable } from '@tabler/icons-react';
import './AccessibleObjects.css';

interface AccessibleObjectsProps {
    objectDescrMap: { [key: string]: string };
    onObjectClick: (name: string) => void
    onAddClick: (name: string) => void
}

type TreeNode = { name: string, lastname: string, children: TreeNode[] }

// A node is a callable function if its (qualified) name ends with "()"
const isFunctionName = (name: string) => name.trimEnd().endsWith(')')

const AccessibleObjects: React.FC<AccessibleObjectsProps> = ({ objectDescrMap, onObjectClick, onAddClick }) => {
    const prepareData = (inputObjects: { [key: string]: string }) => {
        const qualifiedEntries = Object.entries(inputObjects).map((obj) => {
            const [name, descr] = obj
            const qualifiers = name.split(".") // dot-separated qualifiers for each entry
            return {
                name: name,
                qualifiers: qualifiers,
                description: descr
            }
        })
        const rootNode = { lastname: "", name: "", children: [] } as TreeNode
        const getOrCreate = (subtree: TreeNode, lastname: string) => {
            // return child of provided subtree, create if missing
            let child = subtree.children.find(ch => ch.lastname === lastname)
            if (child) {
                // exist, so just return it
                return child
            } else {
                // create
                const name = subtree.name ? subtree.name + "." + lastname : lastname;
                child = { lastname: lastname, name: name, children: [] }
                subtree.children.push(child)
                return child
            }
        }
        qualifiedEntries.forEach(item => {
            let node = rootNode
            item.qualifiers.forEach((qualifier) => {
                node = getOrCreate(node, qualifier)
            })
        })
        return flattenTree(rootNode)
    }

    const [objects, setObjects] = useState(prepareData(objectDescrMap));
    useEffect(() => {
        setObjects(prepareData(objectDescrMap));
    }, [objectDescrMap]);

    const renderArrow = (isOpen: boolean) => {
        if (!isOpen) {
            return <ArrowRightIcon className='ao-arrow' />
        } else {
            return <ArrowDownIcon className='ao-arrow' />
        }
    }

    const renderLeafIcon = (name: string) => {
        if (isFunctionName(name)) {
            return <IconFunction className='ao-icon ao-icon-fn' size={15} stroke={1.75} />
        }
        return <IconVariable className='ao-icon ao-icon-prop' size={15} stroke={1.75} />
    }

    const objectClick = (_e: React.MouseEvent, oname: string) => {
        onObjectClick(oname);
        return true;
    }

    return (
        <div>
            <div className="checkbox-ao">
                <TreeView
                    data={objects}
                    aria-label="Available objects tree"
                    multiSelect
                    propagateSelect
                    propagateSelectUpwards
                    togglableSelect
                    nodeRenderer={({
                        element,
                        isBranch,
                        isExpanded,
                        getNodeProps,
                        level,
                        handleExpand,
                    }) => {
                        const nodeProps = getNodeProps({ onClick: handleExpand })
                        const name = String(element.name)
                        const description = objectDescrMap[name] ?? name
                        const tooltip = (
                            <Tooltip className='ao-tooltip'>
                                <span className='ao-tooltip-name'>{name}</span>
                                <span className='ao-tooltip-descr'>{description}</span>
                            </Tooltip>
                        )
                        return (
                            <Whisper
                                placement="right"
                                trigger="hover"
                                delayOpen={250}
                                controlId={`ao-tip-${element.id}`}
                                speaker={tooltip}
                            >
                                <div
                                    {...nodeProps}
                                    className={`${nodeProps.className ?? ''} ao-node-row`}
                                    style={{
                                        paddingLeft: 10 * (level - 1),
                                    }}
                                >
                                    <span className='ao-row-icon'>
                                        {isBranch ? renderArrow(isExpanded) : renderLeafIcon(name)}
                                    </span>
                                    <span className="name-ao" onClick={(e) => objectClick(e, name)}>{name}</span>
                                    <button className='button-import-ao'
                                        onClick={(e) => {
                                            onAddClick(name);
                                            e.stopPropagation()
                                        }}
                                    >
                                        {"+"}
                                    </button>
                                </div>
                            </Whisper>
                        );
                    }}
                />
            </div>
        </div>
    );
};

export default AccessibleObjects;
