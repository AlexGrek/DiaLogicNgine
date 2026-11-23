---
tags: [characters, discussion]
verified: 2026-11-23
sources: dialogic/src/exec/DiscussionProcessor.ts, dialogic/src/exec/GameExecutor.tsx (discuss), dialogic/src/components/player/DiscussionTopicPicker.tsx, dialogic/src/components/menuitems/charedit/BehaviorMenu.tsx
---
# Discussion and reactions

## What it is

Inside a [[Character dialogs|character dialog]] the player gets a **Discuss…** button. It opens a list of **topics** — things the player knows about —
and the character answers each one. You never write a menu of questions: you write **reactions** ("if asked about *the key*, say…") and the engine
matches them. The more the player learns (facts, people, places, items), the more they can ask about.

## What can be asked about

The topic picker has tabs, filled from what the player **knows or carries** *(verified: asking about something unknown is refused)*:

| Tab | Source | Hidden when |
|---|---|---|
| **Facts** | facts the player has learned (`rt.facts.<uid>.know()`) | the fact's `discussable` is false |
| **People** | characters whose dialog the player has opened ([[Known and visited]]) | the character's `discussable` is false |
| **Places** | locations the player has *seen* — visited, or listed as a visible route ([[Routes and travel]]) | the location's `discussable` is false |
| **Items** | items currently carried | the item is not `discussable` |

(Tab names are interface strings, translatable in [[Localization]].)

## In the editor

On the character's **Dialog…** drawer, **Behavior** lists the reactions. **Create** adds one; each shows its triggers. Open one to set:

| Control | Meaning |
|---|---|
| **Edit triggers** | pick facts, characters, items and places that this reaction answers |
| **Reply text** | what the character says (hidden while a window is chosen) |
| a **dialog/window picker** | answer by opening a window instead; **Just reply** removes it |
| Copy / Delete / Done | as usual (reactions can also be copied between characters) |

## In the JSON

```json
"behavior": {
  "speakingModel": { "dontKnowObject": ["\"Never heard of it.\"", "\"Ask someone else.\""], "dontKnowChar": ["\"Don't know them.\""],
                     "agree": [], "deny": [], "bye": [], "hello": [] },
  "reactions": [
    { "trigger": { "facts": ["bread_rumour"], "chars": [], "items": [], "places": [] },
      "reply": "\"Ha! Everybody says that.\"" },
    { "trigger": { "facts": [], "chars": [], "items": [], "places": ["gate"] },
      "reply": "", "dialogWindow": { "kind": "window", "dialog": "main", "window": "gate_story" },
      "isEnabled": "return rt.props.trusted" }
  ]
}
```

## How a topic is answered  *(all verified)*

1. Take the reactions whose `trigger` **lists that topic** in the matching category (a fact id in `facts`, a character in `chars`, and so on).
2. Drop the ones whose **`isEnabled`** returns false ([[Scripting overview]]: a predicate, state changes discarded).
3. Of the rest, take the one with the **fewest triggers in total** (all four lists added). Among equals, **the one listed first** wins.
4. Answer it:
   * with a **`reply`** — shown as a [[Quick reply]] (it is cleared by the next click);
   * or, if the reaction has a **`dialogWindow`**, the player is sent there with a [[Push]] (the `reply` is ignored); the window's [[Pop]] returns to the
     conversation. Use this for long answers, or to **run code** — the window's `entryScript` can give an item or learn a fact.
5. If **nothing** matches: the character says a **random** line from `speakingModel.dontKnowChar` (when asked about a *person*) or
   `dontKnowObject` (a fact, item or place). If that list is empty the text is **`No reaction`** (built-in English, not translatable).

### Things this means

* Triggers are **alternatives, not combinations.** A reaction with `facts: ["f1"], chars: ["npc2"]` answers *either* topic — it is not "f1 *and* npc2".
* **More specific = fewer triggers.** A reaction dedicated to one topic beats a catch-all that also lists it, even if the catch-all is listed first
  (verified: `[f1]` beat `[f1, npc2]` for the fact `f1`). To override a general answer in a special situation, give the special reaction fewer triggers and an `isEnabled`.
* A disabled reaction does not "fall through" to the next match — it is simply skipped, and if nothing else matches the *don't know* line is used (verified).
* Because the pick among ties follows list order, reorder reactions (or add a trigger to one) to control it.

## The "speaking model"

Only **`dontKnowChar`** and **`dontKnowObject`** are used. `hello`, `agree`, `deny` and `bye` are stored but never read **(from source)**; keep them as
`[]` or leave them for your own scripts.

## Scriptable properties

| Property | Kind | Runs | Changes kept? |
|---|---|---|---|
| reaction `isEnabled` | predicate | each time a topic is answered | no |
| reaction `actionScript` | — | **never** (stored, not executed) | — |

To make a reaction *do* something, send it to a window (`dialogWindow`) and use that window's `entryScript`.

## Gotchas

* The reply text is plain: no variants, no scripts inside it.
* Nothing teaches the player a topic: make sure some link, window or reaction **learns the fact** (`rt.facts.x.know()`) or the topic never appears.
* A character always answers about itself too (it is a *people* topic once known): add a reaction for the character's own uid, or its `dontKnowChar` line is used.
* The topic list shows **known** things from the *whole game*, not only what this character could know. Use reactions to make characters "not know" things.

See also: [[Character dialogs]], [[Characters]], [[Known and visited]].
