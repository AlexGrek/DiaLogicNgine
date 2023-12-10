import { GameDescription } from "./GameDescription";

export default interface Fact {
    uid: string;
    short: string;
    full: string;
    discussable: boolean
}

export function createEmptyFact(uid: string) {
    return {
        uid: uid,
        short: "",
        full: "",
        discussable: true
    }
}

export function getFact(game: GameDescription, uid: string) {
    const factOrnull = game.facts.find((fact) => fact.uid === uid)
    return factOrnull || null
}