import { GameDescription } from "./GameDescription";

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

export function getFact(game: GameDescription, uid: string) {
    const factOrnull = game.facts.find((fact) => fact.uid === uid)
    return factOrnull || null
}