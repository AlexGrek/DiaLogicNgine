export default interface Fact {
    uid: string;
    short: string;
    full: string;
}

export function createEmptyFact(uid: string) {
    return {
        uid: uid,
        short: "",
        full: ""
    }
    
}