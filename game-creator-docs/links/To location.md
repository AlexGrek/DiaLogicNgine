---
tags: [links, link-type]
verified: 2026-11-23
sources: dialogic/src/exec/GameExecutor.tsx (goToLocation)
---
# To location

## What it is

Travel to a **location** — a place with its own text, background, exits and links — instead of a window. Locations are
documented in their own notes (planned, see [[Home]]); this note covers only the link.

## In the JSON

```json
{ "text": "Go to the market", "mainDirection": { "type": "tolocation", "direction": "market" }, "alternativeDirections": [] }
```

`direction` is a location uid from the game's `locs`.

## At play time

* The [[Navigation stack]] **and** the short history are cleared.
* The position becomes `{kind: "location", location: <uid>}`, the current location is set, and the location's own
  entry runs: its background is applied, its entry script runs, and random events can fire there **(from source)**.
* The location's background replaces the current one (verified: the player ended up with the location's picture).

## Gotchas

* Arriving by `tolocation` **forgets all return points**. A [[Pop]] after it needs a fresh [[Push]] made from the location.
* An unknown location uid logs an error and the player stays where they are **(from source)**.

See also: [[Talk to person]], [[Return]], [[Link types]].
