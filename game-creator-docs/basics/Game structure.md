---
tags: [basics]
sources: dialogic/src/game/GameDescription.ts, dialogic/src/exec/GameState.tsx
---
# Game structure

## What it is

A game is one JSON document (`game.json`) that the editor edits and the player runs. It is mostly **content**
(text, pictures, who links to what) plus small **scripts** (JavaScript) that read and change the game's variables.

The core of a story is a three-level tree:

```
Game
└── Dialog            a named scene or chapter ........ [[Dialogs]]
    └── Window        one screen: text + background ... [[Windows]]
        └── Link      a button that leads somewhere ... [[Links]]
```

Around that core sit the other features: characters, locations, items, quests and so on (see the coverage
map in [[Home]]). A story can be told with dialogs, windows and links alone.

## Position and state

While playing, the engine always knows two things:

* **Position** — *where the player is right now*. One of three kinds:
  * a **window** `{kind:"window", dialog, window}`,
  * a **location** `{kind:"location", location}`,
  * a **character dialog** `{kind:"chardialog", char}`.
* **State** — everything remembered: variables (`props`), carried items, known facts, the
  [[Navigation stack]], the current [[Backgrounds|background]], which windows were already visited, and more.

A link changes the position; scripts change the rest of the state. Saving a game stores the state.

## Variables and scripts

Game logic is done with **props** (named variables, [[Props]]) and small JavaScript **scripts** attached to windows, links and other parts
([[Scripting overview]]). The scripts see the game through the [[The rt object|rt object]]; what runs when is in [[Order of execution]].

## About the game itself

Title, version, authors, cover picture and saved-game behaviour are covered in [[Game metadata]]; interface translation and translating a story in [[Localization]]; the editor page that holds these settings in [[Game configuration menu]].

## Where the game starts

`startupDialog` points at the first window:

```json
"startupDialog": { "kind": "window", "dialog": "main", "window": "start" }
```

This is the only valid shape. It must name a real dialog and window, or the game cannot start.

## Everything is wired by names

Windows, dialogs, characters and locations refer to each other by **name/uid strings**. There is no automatic
repair: rename a window and every link that pointed to its old name now points at nothing. Pick stable,
lowercase, snake_case ids (`kitchen`, `v_pay`) and avoid renaming. The editor's **Game configuration → Sanity
check** lists dangling references.

## Next

[[Dialogs]] · [[Windows]] · [[Links]] · [[Turn lifecycle]]
