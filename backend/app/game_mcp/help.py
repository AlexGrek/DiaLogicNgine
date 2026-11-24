"""Small, independently discoverable entries for runtime authoring."""

from .editor import DEFINITIONS, FIELDS

LINKS = {
    "local": "Set direction to a window uid in this dialog.",
    "push": "Set qualifiedDirection to {kind:'window', dialog, window}. Save the current position on the stack before entering the target.",
    "pop": "Resume the last stacked position. With an empty stack, the engine tries the current conversation or location.",
    "jump": "Set qualifiedDirection to {kind:'window', dialog, window}. Enter it with the existing return stack.",
    "resetjump": "Set qualifiedDirection to {kind:'window', dialog, window}. Clear the return stack and enter the target.",
    "tolocation": "Set direction to a location uid. Travel clears the stack and short history and checks eligible events.",
    "toperson": "Set direction to a character uid to start that character's conversation.",
    "reply": "Set replyText to the literal reply. Stay at the current position and display it for one step.",
    "return": "Unwind to the enclosing conversation or location. Use pop for a single pushed frame.",
}

SCRIPTS = {}


def explain_fields(names, text):
    SCRIPTS.update(dict.fromkeys(names.split(), text))


explain_fields(
    "entryScript onEntryScript",
    "JavaScript body executed on entering the window or location. State mutations persist. Example: rt.props.visits += 1",
)
explain_fields(
    "actionCode onClickScript",
    "Run on selecting a link or clicking a scene zone, before navigation. Example: rt.items.add('coin', 1)",
)
explain_fields(
    "isVisible isVisibleScript isVisibleIfScript visibleIf",
    "Return true to show the link, location, scene zone or HUD meter. Example: return rt.facts.clue.known",
)
explain_fields(
    "isEnabled isAccessibleScript",
    "Return true to allow the choice, reaction or destination. Example: return rt.items.has('key')",
)
explain_fields("isDisabledIfScript", "Return true to disable a point-and-click zone, leaving it visible.")
explain_fields(
    "useAlternativeWhen",
    "Return true to follow alternativeDirections[0]. Dialog links require isAlternativeLink=true. PAC zones infer it from the alternative and predicate.",
)
explain_fields(
    "chooseTextScript chooseNameScript chooseDescriptionScript chooseAvatarScript chooseBackgroundScript choosebackgroundScript chooseBgScript",
    "Select a variant from the corresponding text or image list by name or index. Return null for main.",
)
explain_fields(
    "chooseLookScript",
    "Character field. Pick the default look (name or index in chars[i].looks) used when a stage slot names no look. Return null for looks.main. Example: return rt.props.mood > 5 ? 'smile' : null",
)
explain_fields(
    "chooseStageScript",
    "Window field. Return up to 3 stage persons, right to left, replacing the static stage: entries are 'charUid', 'charUid:look' or {character, look?, currentCharacter?}. Return [] for nobody, null to keep window.stage. Example: return rt.facts.betrayal.known ? [{character:'mira', look:'angry'}] : ['mira']",
)
explain_fields(
    "canHappenScript",
    "Return true to make an event eligible for its host and probability check. Example: return !rt.history.thisEventHappened(context)",
)
explain_fields("canHostEventsScript", "Return true to enable eligible events on this host.")
explain_fields(
    "onOpen onComplete onFail",
    "JavaScript state processor for a quest or task lifecycle transition. Example: rt.items.add('reward')",
)
explain_fields("value", "Return the current numeric value for a HUD meter. Example: return rt.props.health")
explain_fields(
    "textProcessingCode actionScript onEventActionScript autoCheckScript changeSituation",
    "Stored by the editor. The current runtime does not execute this field.",
)
SCRIPTS.update(
    {
        "runtime": "Scripts are JS function bodies. Parameters: rt, state, props, ch, facts, objectives, situation, items, context. Mutators change state. Predicates return booleans. Choose a field topic for its contract.",
        "rt.props": "Read/write declared game variables by name, e.g. rt.props.gold += 1.",
        "rt.ch": "Read/write declared character or role variables with rt.ch[characterUid][propName].",
        "rt.items": "Inventory methods include add(uid, qty), remove(uid, qty), has(uid), count(uid), countTotal(), list(), listWithTag(tag).",
        "rt.facts": "Read rt.facts[uid].known and call rt.facts[uid].know() to discover a fact.",
        "rt.objectives": "Address line, quest and task by uid. Call open(), complete() or fail() on a task, or inspect its status.",
        "rt.step": "Read the number of choices and navigation steps taken. Paging through text leaves this counter unchanged.",
        "rt.general": "Read game name, version, description, authors, and extras. Example: return rt.general.extras.chapterName",
        "context": "An optional object supplied by the engine. Event eligibility receives context.thisEvent, the event name.",
        "body": "For a reusable function the body returns whatever the caller expects. For a hook the body processes state when its lifecycle key fires. Request functions or hooks for their formats.",
        "rt.history": "Use dialogVisited(dialog, window?), locationVisited(uid), eventHappened(name), or thisEventHappened(context). Entry scripts see visits prior to the current entry.",
        "situation": "Read rt.situation. Set state.situation to a situation name to change it.",
        "stage": "Full-size persons on a dialog window. chars[i].looks is an ImageList of transparent full-body images (main = default look, list entries named e.g. smile/angry). window.stage is up to 3 StagePerson {character, look?, currentCharacter?}; index 0 stands rightmost, the next ones to its left, overlapping a little; the window actor is highlighted and the others dimmed. window.chooseStageScript overrides it at runtime. Use remove_background to turn a generated image into a transparent look.",
        "functions": "Define {name,args,description,body}. Each JS body can call named game functions. Use a valid JS function name and comma-separated parameters.",
        "hooks": "Define {name,hook,body}. The body runs on the exact lifecycle key, e.g. FACTS::DISCOVERED::<uid>, ITEMS::ACQUIRED::<uid>, ITEMS::LOST::<uid>, SITUATION::STARTED::<name>, SITUATION::ENDED::<name>, QUESTLINE::OPENED::<line>, QUESTLINE::CLOSED::<line>, QUEST::{OPENED|COMPLETED|FAILED}::<line>::<quest>, TASK::{OPENED|COMPLETED|FAILED}::<line>::<quest>::<task>.",
    }
)


_WINDOW_ID_NOTE = (
    "Write exactly {kind:'window', dialog:<dialog name>, window:<window uid>}. "
    "Never {dialogName, windowUid}: older games may still hold that legacy shape, which fails to start "
    "with 'Cannot find UI widget'. patch_field rejects it; replace the whole startupDialog field (path '') "
    "and start_game once to verify."
)
SCHEMA_NOTES = {"startupDialog": _WINDOW_ID_NOTE, "DialogWindowId": _WINDOW_ID_NOTE}


def help_entry(group, topic):
    entries = {"link": LINKS, "script": SCRIPTS, "schema": {**FIELDS, **DEFINITIONS}}[group]
    if not topic:
        return sorted(k for k in entries if k != "GameDescription")
    if topic not in entries or topic == "GameDescription":
        raise ValueError("Unknown topic. Omit topic for the index.")
    if group == "schema" and topic in SCHEMA_NOTES:
        return {**entries[topic], "note": SCHEMA_NOTES[topic]}
    return entries[topic]
