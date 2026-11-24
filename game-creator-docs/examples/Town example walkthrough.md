---
tags: [example]
verified: 2026-11-23
sources: examples/town.json
---
# Town example walkthrough

`examples/town.json` is a complete, tiny game (no images) that uses locations, routes, a locked route, a character with a dialog, discussion,
a reaction that opens a window, a random event and a restart. It passes the repo validator with no warnings and was **played from start to end**
on the real engine on 2026-11-23.

## Load it

```bash
dialogic editor create_project town_demo
dialogic game put town_demo game-creator-docs/examples/town.json
dialogic play start_game town_demo
```

(or paste the file into the editor's JSON import).

## The pieces

| Piece | Where in the JSON | Feature |
|---|---|---|
| `start` window | `dialogs[0].windows[0]` | two text pages; `entryScript` resets `hasKey` and `visits` for replays ([[Windows]]) |
| `square`, `bakery`, `gate` | `locs` | three places; square ↔ bakery and square ↔ gate routes added **both ways** ([[Routes and travel]]) |
| locked gate | `gate.isAccessibleScript: "return rt.props.hasKey"` | route shown but disabled until the key ([[Routes and travel]]) |
| visit counter | `square.onEntryScript` | runs each time the square is *entered* ([[Locations]]) |
| `pigeons` event | `events[0]`, targets `loc:square`, 15 % | random event using the square's built-in host ([[Locations]]) |
| `baker` | `chars[0]` | character with a role (`shopkeeper`), a personal prop and a dialog ([[Characters]], [[Roles and character props]]) |
| greeting variants | `baker.dialog.chooseTextScript` | "You again" after the first chat ([[Character dialogs]]) |
| gossip | a **quick reply** link whose `actionCode` learns `bread_rumour` | teaches a topic ([[Quick reply]], [[Discussion and reactions]]) |
| reactions | `baker.dialog.behavior.reactions` | answer about the fact; asking about the **gate** pushes `gate_story`, whose link gives the key |
| Leave | a [[Return]] link | back to the bakery (the conversation was opened from a location) |
| the end | `the_end` window, [[Reset jump]] to `start` | ending with "play again" |

## The verified playthrough

```text
start (page 1) → continue → "Step into the square"         → Town square   (routes: Bakery, Old gate [locked])
travel bakery                                              → Bakery        (link: Talk to the baker)
Talk to the baker                                          → Talking with Baker
Listen to the gossip      (quick reply, learns the fact)   → "They say the bread here is better…"
Discuss → Facts → The bakery's bread is famous             → "Ha! Everybody says that…"
Discuss → Places → Old gate                                → gate_story window
Take the key              (pop, sets hasKey)               → Talking with Baker — "You again…"
Leave                     (return)                         → Bakery
travel square, travel gate (now unlocked)                  → Old gate
Unlock the gate           (jump)                           → the_end
```

The same steps with the CLI: `dialogic play act S continue`, `act S choose_link 0`, `act S travel -target_id bakery`,
`act S discuss -topic_type fact -target_id bread_rumour`, `act S discuss -topic_type loc -target_id gate`. If the pigeons event interrupts an
arrival, pop out of it with its *Carry on* link.
