import React from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { Item } from '../../../game/Items';
import { SelectPicker } from 'rsuite';
import lodash from 'lodash';

interface ItemsPickerProps {
    game: GameDescription;
    placeholder?: string
    onPickUID?: (picked: string | null) => void
    onPickItem?: (picked: Item | null) => void
    excludeUids?: string[]
    value?: string | string[]
    multiple?: boolean
}

const ItemsPicker: React.FC<ItemsPickerProps> = ({ game, multiple, placeholder, value, excludeUids, onPickUID, onPickItem }) => {
    const data = game.items
        .filter(it => excludeUids === undefined ? true : !excludeUids.includes(it.uid))
        .map(
            item => ({ label: item.name, value: item.uid })
        );

    const clicked = (v: string | null) => {
        if (onPickUID) {
            onPickUID(v)
        }
        if (onPickItem) {
            if (v === null) {
                onPickItem(null)
                return
            }
            const item = game.items.find(it => it.uid === v)
            if (!item) {
                onPickItem(null)
            } else {
                onPickItem(item)
            }
        }
    }

    const singleValue = lodash.isString(value) ? value : undefined

    return (
        !multiple ? <SelectPicker value={singleValue} placeholder={placeholder} data={data} onChange={(value) => clicked(value)} />
            : <span>Currently unsupported</span>
    );
};

export default ItemsPicker;
