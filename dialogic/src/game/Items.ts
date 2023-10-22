export interface Item {
    uid: string
    name: string
    description: string
    price?: number
    unique: false
    tags: string[]
    image?: string
    thumbnail?: string
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
        tags: []
    }
}