---
tags: [events]
verified: 2026-11-24
sources: dialogic/src/game/Events.ts, dialogic/src/exec/EventsProcessor.ts, dialogic/src/exec/GameExecutor.tsx (goToLocation), dialogic/src/game/Loc.ts (getLocEventHosts), dialogic/src/components/menuitems/eventedit/*, dialogic/src/exec/Runtime.ts (RuntimeHistoryAccessManager)
---
# Random events

## What it is

A **random event** may interrupt the player **when they arrive at a location**: a neighbour knocks, a patrol stops you, it starts to
rain. Each event has a chance and a destination window. If it fires, the player is pushed into that window, and when they leave it
(with a [[Pop]] link) they are back at the location.

Events are attached to locations through **event hosts**: named channels that locations subscribe to.

```
event "patrol"  targets ["street_events"]
location "market"  eventHosts ["street_events"]   → the patrol can happen at the market
location "bridge"  eventHosts ["street_events"]   → …and at the bridge
location "home"    eventHosts null               → never
```

Every location is also, automatically, its own host **`loc:<uid>`**, so an event can target one place without a named host. Hosting is
covered in [[Locations]]: `null` = never, `[]` = only its own `loc:<uid>`, a list = those hosts as well.

## In the editor

Sidebar **Scripts**, then the **Events** tab.

* **Event hosts** column: **Custom event hosts** is the list of named hosts (`game.eventHosts`). **Predefined event hosts** shows the
  automatic `loc:<uid>` and `char:<uid>` hosts.
* **Events** column: **Create event**; a **Target hosts** filter; one card per event. Click one to open the editor:

| Control | Field |
|---|---|
| **Event name** | `name` (required to save; also the id for `rt.history.eventHappened`) |
| **Hosts → Target hosts** | `targets` |
| **Probability → High priority** | `highPriority` |
| **Probability** slider | `probability`, 0–100 % |
| **Scripting** | `onEventActionScript` (**never runs**), `canHappenScript` |
| **Destination → Push to another window** + dialog/window picker | `link` |

A location subscribes on its own page: **Events → Can host events** plus its host list ([[Locations]]).

## In the JSON

```json
"eventHosts": ["street_events"],
"events": [
  { "name": "patrol", "highPriority": false, "probability": 15,
    "targets": ["street_events", "loc:station"],
    "canHappenScript": "return !rt.props.has_papers",
    "link": { "kind": "window", "dialog": "events", "window": "patrol_stop" } }
]
```

## At play time

On arrival at a location (a [[To location]] link or a route), **before** the location's own entry runs:

1. If the location does not host events (`eventHosts: null`, or its `canHostEventsScript` returns false), nothing is rolled.
2. Collect the events whose `targets` share at least one host with the location (its named hosts plus `loc:<uid>`).
3. Order them: **high-priority events first, lowest probability first**, then normal events, **highest probability first** (from source).
4. Walk that list. For each event whose `canHappenScript` allows it (a predicate; missing = allowed), roll a number **0–100** and fire if
   it is **≤ probability**. **The first event that fires ends the roll**; at most one event per arrival.
5. Firing = a [[Push]] to `link`. The location stays on the [[Navigation stack]], and the location's entry is postponed until the player
   pops back (verified). An event with **no destination** "fires" without doing anything and still ends the roll (from source).

Not rolled: arriving at a character, entering a window, returning to the location with [[Pop]], loading a save.

### What does *not* happen  *(verified on 2026-11-24)*

* **The event is not recorded.** `state.happenedEvents` stays empty, so `rt.history.eventHappened('patrol')` and
  `rt.history.thisEventHappened(context)` are **always false** for real events. To run an event once, set a prop in the event window's
  `entryScript` and check it in `canHappenScript`:
  ```js
  // canHappenScript
  return !rt.props.patrol_done
  // entryScript of events/patrol_stop
  rt.props.patrol_done = true
  ```
* **`onEventActionScript` never runs.** Put the event's effects in the destination window's `entryScript`.

## Scriptable properties

| Property | Kind | Runs | Must return | Changes kept |
|---|---|---|---|---|
| `canHappenScript` | predicate | while rolling, per candidate event; gets `context.thisEvent` = the event name | true/false (missing = true) | no |
| `onEventActionScript` | — | **never** | — | — |

## Gotchas

* **Probability 0 is not "never"**: the roll is 0–100 inclusive, so 0 still fires about 1 time in 101. Use `canHappenScript` to switch an
  event off.
* Probability 100 always fires (if allowed), so it starves every lower event in the list. Use it only for scripted "ambushes" gated by
  `canHappenScript`.
* High-priority events are tried **rarest first**, which is the opposite of the normal ones.
* **`char:<uid>` hosts are listed in the editor, but characters never roll events**; only locations do. The same goes for event hosts on
  point-and-click scenes (from source).
* The event window must have a way back: a [[Pop]] link returns to the location, and the location's entry then runs.

See also: [[Locations]], [[Order of execution]], [[Navigation stack]].
