import { trace } from "../Trace";
import { CharacterDialog, Reaction } from "../game/Character";
import { LinkType, createDialogLink } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { DiscussionTopicType, GameExecManager } from "./GameExecutor";
import { State } from "./GameState";

export default class DiscussionProcessor {
    exec: GameExecManager
    game: GameDescription

    constructor(exec: GameExecManager) {
        this.exec = exec
        this.game = exec.game
    }

    /**
     * Fallback reply when no reaction matches: one of the character's own
     * speakingModel "don't know" lines (dontKnowChar for people, dontKnowObject
     * for facts/items/places), or "No reaction" if the model has none.
     */
    unknownReaction(char?: CharacterDialog, category?: DiscussionTopicType) {
        const model = char?.behavior?.speakingModel
        const variants = (category === "char" ? model?.dontKnowChar : model?.dontKnowObject) ?? []
        const lines = variants.filter(v => v && v.trim())
        const link = createDialogLink()
        link.mainDirection.type = LinkType.QuickReply
        link.mainDirection.replyText = lines.length > 0
            ? lines[Math.floor(Math.random() * lines.length)]
            : "No reaction"
        return link
    }

    isEnabledReaction(r: Reaction, state: State) {
        return this.exec.getBoolDecisionWithDefault(state, true, r.isEnabled)
    }

    findBestMatchingReaction(filter: (r: Reaction) => boolean, reactions: Reaction[], state: State) {
        const totalTriggers = (r: Reaction) => {
            const t = r.trigger
            return t.chars.length + t.facts.length + t.items.length + t.places.length
        }
        const matches = reactions.filter(filter).filter(r => this.isEnabledReaction(r, state))
        const sorted = matches.sort((a, b) => totalTriggers(a) - totalTriggers(b))
        trace(`Reactions found: ${sorted.length}`)
        if (sorted.length <= 0) {
            return null
        }
        else {
            return sorted[0]
        }
    }

    returnReaction(reaction: Reaction) {
        trace(`Reaction: ${JSON.stringify(reaction)}`)
        if (reaction.dialogWindow) {
            const link = createDialogLink()
            link.mainDirection.type = LinkType.Push
            link.mainDirection.qualifiedDirection = reaction.dialogWindow
            return link
        }

        const link = createDialogLink()
        link.mainDirection.type = LinkType.QuickReply
        link.mainDirection.replyText = reaction.reply
        return link
    }

    ofChar(id: string, char: CharacterDialog, state: State) {
        const reacts = char.behavior.reactions
        const reaction = this.findBestMatchingReaction((r: Reaction) => {
            return r.trigger.chars.includes(id)
        }, reacts, state)

        if (!reaction)
            return this.unknownReaction(char, "char");

        return this.returnReaction(reaction)
    }

    ofFact(id: string, char: CharacterDialog, state: State) {
        const reacts = char.behavior.reactions
        const reaction = this.findBestMatchingReaction((r: Reaction) => {
            return r.trigger.facts.includes(id)
        }, reacts, state)

        if (!reaction)
            return this.unknownReaction(char, "fact");

        return this.returnReaction(reaction)
    }

    ofLoc(id: string, char: CharacterDialog, state: State) {
        const reacts = char.behavior.reactions
        const reaction = this.findBestMatchingReaction((r: Reaction) => {
            return r.trigger.places.includes(id)
        }, reacts, state)

        if (!reaction)
            return this.unknownReaction(char, "loc");

        return this.returnReaction(reaction)
    }

    ofItem(id: string, char: CharacterDialog, state: State) {
        const reacts = char.behavior.reactions
        const reaction = this.findBestMatchingReaction((r: Reaction) => {
            return r.trigger.items.includes(id)
        }, reacts, state)

        if (!reaction)
            return this.unknownReaction(char, "item");

        return this.returnReaction(reaction)
    }
}