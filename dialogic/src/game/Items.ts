export interface Item {
    uid: string
    name: string
    description: string
    price?: number
    unique: boolean
    tags: string[]
    stats: { [key: string]: number | string }
    image?: string
    thumbnail?: string,
    canGive: boolean
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
        stats: {}
    }
}