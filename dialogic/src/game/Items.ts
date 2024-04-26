export interface Item {
    uid: string
    name: string
    description: string
    price?: number
    discussable: boolean
    unique: boolean
    tags: string[]
    stats: { [key: string]: number | string }
    image?: string
    thumbnail?: string,
    canGive: boolean
    stackable: boolean
}

export function createEmptyItem(uid: string): Item {
    let name = ""
    if (uid.length > 1) {
        name = uid.charAt(0).toUpperCase() + uid.slice(1);
    }
    return {
        uid: uid,
        name: name,
        description: "",
        price: 0,
        unique: false,
        tags: [],
        canGive: true,
        stats: {},
        discussable: true,
        stackable: false
    }
}

export function getItemByIdOrNull(items: Item[], uid: string): Item | null {
    const foundItem = items.find(item => item.uid === uid);
    return foundItem || null;
}

export function getItemByIdOrUnknown(items: Item[], uid: string): Item {
    const foundItem = items.find(item => item.uid === uid);
    return foundItem || {
        uid: uid,
        name: "UNKNOWN ITEM",
        description: `Item with id ${uid} was not found`,
        price: 0,
        unique: false,
        tags: [],
        canGive: true,
        stats: {},
        discussable: true,
        stackable: true
    };
}