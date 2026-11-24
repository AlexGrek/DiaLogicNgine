---
tags: [items, inventory]
verified: 2026-11-24
sources: dialogic/src/game/Items.ts, dialogic/src/exec/Runtime.ts (RuntimeItemsManager), dialogic/src/exec/GameExecutor.tsx (useItemInDialog), dialogic/src/exec/HooksProcessor.ts, dialogic/src/components/menuitems/items/ItemsMenu.tsx, dialogic/src/components/player/InventoryTab.tsx, InventoryView.tsx, GameMenuPanel.tsx
---
# Items and inventory

## What it is

**Items** are things the player carries: a key, coins, a letter. You declare every item once in the game. Scripts give and take them, and
the player sees them in **Menu → Inventory**. Carried items can be:

* **checked** by scripts (`rt.items.has('key')`, `rt.items.count('coin')`), to open doors, pay prices or unlock links;
* **used** on the current dialog window with the inventory's **Use** button (see below);
* **asked about** in a character dialog if they are discussable ([[Discussion and reactions]]).

## In the editor

Sidebar **Items**. Type a uid and create the item; existing items are cards, and clicking one opens **Edit item**.

| Control | Field | Notes |
|---|---|---|
| **display item name** | `name` | shown in the inventory, toasts and topics. A new item's name is its uid with a capital first letter. |
| **item description** | `description` | inventory details text |
| **Images → Image** | `image` | large picture in the item details |
| **Images → Thumbnail** | `thumbnail` | small card picture. Each falls back to the other when missing. Both pickers have AI generation ([[AI helpers]]). |
| **Properties → Unique**, **Can give to NPC** | `unique`, `canGive` | **stored but not used by the engine** (from source) |
| **Properties → Stackable** | `stackable` | see "Stacking" below |
| **Stats** + *Copy stats from…* | `stats` | key → value pairs shown as chips in the item details |
| **Tags** + *Copy tags from…* | `tags` | free labels for scripts (`rt.items.listWithTag`) |
| copy / paste | — | items can be copied between games (paste asks for a new uid) |

There is no editor control for `price` (unused) or `discussable` (JSON only; new items are discussable).

## In the JSON

```json
"items": [
  { "uid": "rusty_key", "name": "Rusty key", "description": "An old iron key.",
    "image": "rusty_key.png", "thumbnail": "rusty_key_thumb.png",
    "stackable": false, "discussable": true, "tags": ["quest_item"], "stats": { "weight": 1 },
    "unique": true, "canGive": true, "price": 0 },
  { "uid": "coin", "name": "Coin", "description": "Small change.", "stackable": true,
    "discussable": false, "tags": ["money"], "stats": {}, "unique": false, "canGive": true }
]
```

The carried items live in the state as `carriedItems: [{ "item": "<uid>", "quantity": n }]`.

## At play time

### Giving and taking

| Call | Effect |
|---|---|
| `rt.items.add('coin', 3)` | adds 3. The count is floored, and anything below 1 counts as **1**. An unknown uid logs an error and adds nothing. |
| `rt.items.remove('coin', 2)` | removes up to 2. Removing more than you carry just empties it. |
| `rt.items.has('rusty_key')` | true when at least one is carried |
| `rt.items.count('coin')` | total quantity |
| `rt.items.countTotal()` | total of all quantities |
| `rt.items.list()` / `rt.items.listWithTag('money')` | carried entries `{item, quantity}` |

### Stacking  *(verified)*

* **Stackable** items merge into one entry: `add('coin', 3)` gives one card with *×3*.
* **Non-stackable** items get **one entry per unit**: adding `rusty_key` twice shows two separate cards.

### Notifications and hooks

* `add` shows an **Item received** toast with the item's thumbnail; *Name ×3* when several were added.
* `remove` shows **no** toast (from source). The *Item lost* toast style exists, but nothing triggers it.
* After the script finishes, **`ITEMS::ACQUIRED::<uid>`** fires if the total of that item went up and **`ITEMS::LOST::<uid>`** if it went
  down ([[Hooks]]). Adding and removing the same amount in one script fires neither.

### The inventory in the player

**Menu → Inventory** shows the carried items in the layout chosen in **Visuals → Inventory** (matrix, list, popup, subwindow or scroll; see
[[Visuals]]). Selecting an item shows its name, image, description and stats, plus a **Use** button.

## Using an item on a window

The **Use** button is always shown, but it only does something when the player is in a **dialog window that has an `entryScript`**. Then
(verified):

1. The menu closes.
2. That window's **`entryScript` runs again**, with **`context.usedItem`** set to the item's uid.
3. State changes are kept and hooks fire. There is **no navigation and no text re-roll**, and the item is **not removed** automatically.

In a location, a character dialog, or a window without an entry script, **Use** does nothing.

So a window that reacts to items needs an entry script that branches on `context`. On a normal entry **`context` is `undefined`**, so
`context.usedItem` **throws**; always write `context?.usedItem` (verified):

```js
// entryScript of the window "locked_door"
if (context?.usedItem) {
  if (context.usedItem === 'rusty_key') {
    rt.items.remove('rusty_key')
    rt.props.door_open = true          // e.g. makes an "Enter" link visible
  }
  return                               // don't redo the normal entry logic
}
// normal entry logic here
```

Without the early `return`, everything the entry script does on arrival runs again every time an item is used.

## Scriptable properties

Items have no script slots. Item use is handled by the **window's** `entryScript` (above).

## Gotchas

* The **Use** label is built-in English and cannot be translated ([[Localization]]).
* The player gets no feedback when an item has no effect; consider a [[Quick reply]]-style text (set a prop that a text variant reads).
* `unique`, `canGive` and `price` do nothing. Enforce uniqueness yourself: `if (!rt.items.has('x')) rt.items.add('x')`.
* Items given inside a **predicate** are discarded ([[Scripting overview]]).
* Saves store item uids. An item deleted from the game shows as *UNKNOWN ITEM* in old saves.

See also: [[The rt object]], [[Hooks]], [[Discussion and reactions]], [[Point-and-click scenes]].
