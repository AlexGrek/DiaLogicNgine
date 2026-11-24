---
tags: [configuration, editor]
sources: dialogic/src/components/menuitems/configuration/ConfigurationMenu.tsx, GeneralEditor.tsx
---
# Game configuration menu

## What it is

The editor page **Game configuration** holds the settings that belong to the whole game rather than to one dialog, character
or location. It is a row of tabs:

| Tab | What you set there | Documented in |
|---|---|---|
| **About** | name, description, version, authors, additional info (press **Edit**) | [[Game metadata]] |
| **Basic** | the **startup dialog**: the window where every new game begins | [[Game structure]], [[Game metadata]] |
| **Situations** | the list of situation names | [[Situations]] |
| **Main menu** | menu layout (*Classic* or *Mobile*) and the menu background picture | [[Game metadata]], [[Backgrounds]] |
| **Localization** | the interface-translation table | [[Localization]] |
| **Developer / AI** | a text suffix appended to quick AI image prompts (e.g. "fantasy RPG style, pixel art") | [[Game metadata]], [[AI helpers]] |
| **Sanity check** | a list of dangling references and missing image files | [[Sanity check]] |

Visual styling (fonts, aspect ratio, link-button looks) lives in a separate **Visuals** area: [[Visuals]].

## In the JSON

Each tab edits a top-level key of `game.json`:

```json
{
  "general": { "name": "…", "version": "0.1.0", "authors": [], "description": "", "extras": {} },
  "startupDialog": { "kind": "window", "dialog": "main", "window": "start" },
  "situations": [],
  "startMenu": { "menuBackground": "room.jpg", "layout": "classic" },
  "translations": {},
  "dev": { "basicPromptSuffix": "" }
}
```
