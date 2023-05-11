import React, { useState, useEffect } from 'react';
import TreeView, { INode, TreeViewData, flattenTree } from "react-accessible-treeview";
import OneColumnIcon from '@rsuite/icons/OneColumn';
import ArrowRightIcon from '@rsuite/icons/ArrowRight';
import ArrowDownIcon from '@rsuite/icons/ArrowDown';
import './AccessibleObjects.css';

interface AccessibleObjectsProps {
    objectDescrMap: { [key: string]: string };
    onObjectClick: (name: string) => void
    onAddClick: (name: string) => void
}

type TreeNode = {name: string, lastname: string, children: TreeNode[]}

const AccessibleObjects: React.FC<AccessibleObjectsProps> = ({ objectDescrMap, onObjectClick, onAddClick }) => {
    const prepareData = (inputObjects: { [key: string]: string }) => {
        const qualifiedEntries = Object.entries(inputObjects).map((obj) => {
            const [name, descr] = obj
            const qualifiers = name.split(".") // comma-separated qualifiers for each entry
            return {
                name: name,
                qualifiers: qualifiers,
                description: descr
            }
        })
        var rootNode = { lastname: "", name: "", children: [] } as TreeNode
        const getOrCreate = (subtree: TreeNode, lastname: string) => {
            // return child of provided subtree, create if missing
            var child = subtree.children.find(ch => ch.lastname === lastname)
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
            var node = rootNode
            item.qualifiers.forEach((qualifier) => {
                node = getOrCreate(node, qualifier)
            })
        })
        return flattenTree(rootNode)
    }
    
    const [objects, setObjects] = useState<TreeViewData>(prepareData(objectDescrMap));
    useEffect(() => {
        setObjects(prepareData(objectDescrMap));
    }, [objectDescrMap]);

    const renderArrow = (isOpen: boolean) => {
        if (!isOpen) {
            return <ArrowRightIcon></ArrowRightIcon>
        } else {
            return <ArrowDownIcon></ArrowDownIcon>
        }
    }

    const objectClick = (e: any, oname: string) => {
        onObjectClick(oname);
        return true;
    }

    return (
        <div>
            <div className="checkbox-ao">
                <TreeView
                    data={objects}
                    aria-label="Checkbox tree"
                    multiSelect
                    propagateSelect
                    propagateSelectUpwards
                    togglableSelect
                    nodeRenderer={({
                        element,
                        isBranch,
                        isExpanded,
                        isSelected,
                        isDisabled,
                        isHalfSelected,
                        getNodeProps,
                        level,
                        handleSelect,
                        handleExpand,
                        dispatch,
                    }) => {
                        return (
                            <>
                                <div
                                    {...getNodeProps({ onClick: handleExpand })}
                                    style={{
                                        marginLeft: 1 * (level - 1),
                                    }}
                                >
                                    {isBranch && renderArrow(isExpanded)}
                                    <span className="name-ao" onClick={(e) => objectClick(e, element.name)}>{element.name}</span>
                                    <button className='button-import-ao'
                                        onClick={(e) => {
                                            onAddClick(element.name);
                                            e.stopPropagation()
                                        } 
                                        }
                                    >
                                        {"+"}
                                    </button>
                                </div>
                            </>
                        );
                    }}
                />
            </div>
        </div>
    );
};

export default AccessibleObjects;
