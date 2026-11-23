---
tags: [locations]
verified: 2026-11-23
sources: dialogic/src/exec/RenderView.ts (getRoutesForLoc), dialogic/src/exec/GameExecutor.tsx (locRouteApply, addAllToKnownPlaces, goToLocation), dialogic/src/components/player/LocButton.tsx
---
# Routes and travel

## What it is

A **route** is an exit from one [[Locations|location]] to another. Routes appear as buttons with the destination's **name and thumbnail**, in a column beside the text.
Clicking one **travels** there. Routes are the map; [[Links]] are the story actions.

## In the editor

In a location's drawer, **Routes → Select locations → Add** adds exits (several at once); each listed route has a remove button. The picker offers every
other location. To make a two-way connection, add the route in **both** locations.

## In the JSON

```json
{ "uid": "hall", "routes": ["yard", "cellar", "attic"], "…": "…" },
{ "uid": "yard", "routes": ["hall"], "…": "…" }
```

## Hiding and locking a route

The two scripts live on the **destination**, but they are asked while the player stands in the *source*:

| On the destination | When false | Verified result |
|---|---|---|
| `isVisibleScript` | the route is **not listed** in the source | with `return !rt.props.hidevault`, setting the prop removed *Vault* from the hall's routes |
| `isAccessibleScript` | the route is listed but **disabled** | the button is greyed out, and travelling is refused (`Route '…' is disabled`) until the script returns true |

Because they sit on the destination, they apply to **every** route leading there. For "locked only from this side", use a [[Links|link]] with
`isEnabled` instead of a route, or give the destination a script that looks at `rt.history`/the current location.

A locked door pattern:

```json
{ "uid": "attic", "isAccessibleScript": "return rt.props.hasKey", "…": "…" }
```

## What travelling does  *(verified)*

1. The step counter goes up.
2. The [[Navigation stack]] and the short history are **emptied**.
3. The position becomes the destination. Random events are rolled; if one fires its window is shown first (the location is on the stack underneath) —
   the destination's own entry waits until the player leaves it ([[Locations]], [[Order of execution]]).
4. Otherwise the destination is entered: background, `onEntryScript`, hooks, *known* and *visited* marks.

A route click does **not** run any link's `actionCode`. To run code on every arrival use the destination's `onEntryScript`. Travel through a
[[To location]] link is the same as a route, plus the link's own `actionCode` first.

## Known places

Entering a location marks as **known**: that location and **every route visible from it** — including locked ones (verified: `knownPlaces` held all five hall exits;
a hidden route was left out). Known places are the topics available under **Places** in [[Discussion and reactions]]. **Visited** is stricter: only the places
the player really stood in ([[Known and visited]]).

## From a script or the CLI

* `dialogic play act SESSION travel -target_id yard` (or `-index N` among the *visible* routes).
* The route list shown to the player excludes hidden routes, so a route's index is its position among visible ones.

## Gotchas

* Routes are **one-way**; forgetting the return route strands the player (a location needs an exit or a link).
* A locked route stays visible and marks the place known — good for "I can see the gate but need a key", bad if you wanted a secret (use `isVisibleScript`).
* The destination decides visibility and access for *all* its entrances.
* Moving through routes erases the stack: don't expect a [[Pop]] after travel to return to where the player came from.

See also: [[Locations]], [[To location]].
