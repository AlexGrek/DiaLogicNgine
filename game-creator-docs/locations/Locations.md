---
tags: [locations]
verified: 2026-11-23
sources: dialogic/src/game/Loc.ts, dialogic/src/exec/GameExecutor.tsx (goToLocation, executeEntry), dialogic/src/exec/RenderView.ts (renderLoc), dialogic/src/exec/EventsProcessor.ts, dialogic/src/components/menuitems/locedit/LocEditor.tsx, dialogic/src/components/player/LocView.tsx
---
# Locations

## What it is

A **location** is a *place* the player can be in — a market, a cellar, a bridge. Like a [[Windows|window]] it has text, a [[Backgrounds|background]] and
[[Links|links]]; unlike a window it also has **routes** to other locations ([[Routes and travel]]), is tracked as *known* and *visited*
([[Known and visited]]), can host random events, and can be a topic of conversation ([[Discussion and reactions]]).

Use windows for **scenes** (a story told in order) and locations for **places** (a map the player moves around and returns to). Most games mix both: a
window can send the player to a location with a [[To location]] link, and a location can open a window with a [[Push]] link.

## In the editor

The locations section lists your locations (with a graph view of how they connect). Opening one gives a drawer titled with its uid:

| Part | What it does |
|---|---|
| **UID (has to be unique)** | the id. Editable only until the first save; must be a valid identifier. If left empty, it is filled from the display name when you leave that field. |
| **Thumbnail image** | the picture on this location's *route button* in other locations |
| **Routes** | **Select locations → Add** adds exits from here; each can be removed ([[Routes and travel]]) |
| **Display name** | the name on route buttons and in discussion topic lists (plain text, no variants) |
| **Display text** | what the player reads on arrival — a text with [[Variants]] |
| **Background** | the picture, with variants ([[Backgrounds]]) |
| **Scripting** | `isAccessibleScript`, `isVisibleScript`, `chooseTextScript`, `choosebackgroundScript`, `onEntryScript` |
| **Events** | **Can host events**, event hosts and `canHostEventsScript` (see below) |
| **Links** | the location's own buttons, edited like a window's |

The header has **Copy**, **Demo** (play from this location), **Delete**, **Discard** and **Save**; Save needs a valid uid.

## In the JSON

```json
{
  "uid": "bakery",
  "displayName": "Bakery",
  "thumbnail": "bakery_thumb.jpg",
  "backgrounds": { "main": "bakery.jpg", "list": [] },
  "text": { "main": "Warm air, flour on every surface.", "list": [] },
  "routes": ["square"],
  "links": [ { "text": "Talk to the baker", "mainDirection": { "type": "toperson", "direction": "baker" }, "alternativeDirections": [] } ],
  "discussable": true,
  "eventHosts": [],
  "onEntryScript": "rt.props.visits += 1",
  "goto": []
}
```

| Field | Meaning |
|---|---|
| `uid` | identity; referenced by routes, [[To location]] links, event targets, `rt.history.locationVisited`, `changeLocationInBg` |
| `displayName` | a **plain string** (unlike a character's name, it has no variants) |
| `text`, `backgrounds`, `thumbnail` | as above; all optional-looking but the keys must exist |
| `routes` | uids of the locations reachable from here — **one-way** |
| `links` | any [[Link types|link type]] |
| `discussable` | `false` hides the place from conversation topic lists. JSON only — the drawer has no checkbox for it |
| `eventHosts` | `null` = never hosts events; `[]` or a list = can (see "Hosting random events" below) |
| `goto` | **never used** by the engine (only listed by the sanity check); leave `[]` |

## At play time

**Arriving** (a [[To location]] link or a route; see [[Routes and travel]]) runs, in order *(verified)*:
the [[Navigation stack]] and short history are cleared → **random events are rolled** → if none fires, the location is **entered**:
its background is applied, **`onEntryScript`** runs (then [[Hooks]]), and it is marked *known* (with every visible route) and *visited*.
If an event fires, entry is **postponed** until the player leaves the event window ([[Order of execution]]).

**What the player sees:**

* the text — `chooseTextScript` picks a variant on every draw (verified: a `night` variant replaced the plain text);
* the location's **links** as buttons (visibility and enabling work exactly as for window links, [[Links]]);
* the **routes** as buttons with the destinations' names and thumbnails;
* **no page splitting**: unlike a window's text, a location's text is shown as one block, so `---` separators are not turned into pages *(from source)*.

A location without a background leaves the game state with **no** background, but the picture already on screen stays *(from source)*; give every
location its own picture if the previous place's image would look wrong.

**Links and returning.** A location's links can leave and come back: a [[Push]] link opens a window, and its [[Pop]] or [[Return]] link brings the player
back to the location (verified, and the location's entry runs again). A character conversation started from a location returns to it with [[Return]].

**Current location without moving.** A window's or link's `changeLocationInBg` sets the *current location* in the state without going there. The
visible effect: a later [[Return]] with nothing on the stack takes the player to that location (verified).

## Hosting random events

Random events are rolled **only when the player arrives at a location** (not at characters, not at windows). Whether a location can host them:

| `eventHosts` | Result |
|---|---|
| `null` (editor: **Can host events** unticked) | never hosts events (verified) |
| `[]` (ticked, no hosts chosen) | hosts events that target **`loc:<uid>`** — every location is automatically its own host (verified: an event with `targets: ["loc:yard"]` fired at a location with `eventHosts: []`) |
| `["market_events"]` | also hosts events that target that named host, shared by every location listing it |

`canHostEventsScript` can veto hosting: when it returns false no event is rolled (verified). Arriving back by [[Pop]] does not roll again (verified).
The roll itself is described in [[Order of execution]].

## Scriptable properties

| Property | Kind | When it runs | Returns | Changes kept? |
|---|---|---|---|---|
| `onEntryScript` | action | when the location is actually entered (after any event) | nothing | **yes** |
| `chooseTextScript` | picker | every draw | text variant name/index/`null` | no |
| `choosebackgroundScript` *(sic: lowercase b)* | picker | on entry | background variant | no |
| `isVisibleScript` | predicate | while the player is in a place that has a route **to** this one | true/false | no |
| `isAccessibleScript` | predicate | same | true/false | no |
| `canHostEventsScript` | predicate | when events would be rolled on arrival | true/false | no |

Note that `isVisibleScript` and `isAccessibleScript` describe whether *this location can be reached from elsewhere*; they are evaluated
for the destination while the player stands in the source ([[Routes and travel]]). Kinds: [[Scripting overview]].

## Gotchas

* **Routes are one-way.** Adding `cellar` to `hall`'s routes does not add `hall` to `cellar`'s.
* Renaming a location's uid breaks every route, link, event target and script that names it; the editor locks the uid after the first save.
* `goto` and (in the drawer) `discussable` do nothing / are not editable; see the table above.
* The location's own entry does not run if an event interrupts the arrival.
* Place an exit in every location, or give it links; a location with neither is a dead end.

See also: [[Routes and travel]], [[Characters]], [[To location]], [[Return]].
