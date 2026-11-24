---
tags: [publishing]
verified: 2026-11-24
sources: dialogic/src/components/home/HomePage.tsx, dialogic/src/components/gallery/GalleryPage.tsx, dialogic/src/components/play/PlayOnlyPage.tsx, dialogic/src/game/templates.ts, backend/server.md, backend/app/api/v1/projects.py
---
# Publishing and sharing

## Projects and ownership

Every game is a **project** on the server, owned by the account that created it. Only the owner can see it in their list, open it in the
editor, save it, upload images or delete it. Accounts are free to register.

The signed-in home page (`/`) has:

* **New project → Pick a template**: **Starter** (a small game with one of everything) or **Scripting Lab** (a showcase of every script
  hook point), plus a name.
* **Saved projects**: a card per project with the title, authors, description, counts of dialogs, characters and locations, the last
  update, and buttons to **open**, **play**, **delete** (asks first), **publish**, and **Copy link**.

## Publishing

A project is **private** until you publish it. On its card, the publish toggle says:

* *"Private to you. Click to publish it to the public gallery."*
* *"Listed in the public gallery — anyone can play it. Click to unpublish."* (with a *published* badge)

Publishing means:

| | Private | Published |
|---|---|---|
| Listed in the public gallery (`/games`; also `/` for visitors who are not signed in) | no | yes |
| `/play/<project>` works for others | no (403) | yes, **without an account** |
| Others can edit it | no | no |
| Images readable by URL | yes | yes |

The gallery shows the title, authors, description and counts. They come from **Game properties → About** and refresh **each time you
save** ([[Game metadata]]). Unpublishing hides the game immediately. Players keep their browser saves, but cannot open the game again.

Image files are public by URL even for private projects. Do not put anything secret in images.

## Sharing a link

**Copy link** copies `<site>/play/<project>`. That page is the bare player: no editor, no sidebar, the start menu first. Saves made there
are stored in the visitor's browser ([[Saving and loading]]).

* The link works for others only while the game is **published**.
* The URL uses the **project name** (fixed at creation), not the title. Pick a readable project name.
* What players get is the **last saved** version. Unsaved editor changes are not visible, and a player mid-game picks up your new version
  the next time they load the page.

## Playing through MCP

Published games, plus your own unpublished ones, can also be played by AI agents through the player MCP ([[MCP servers]]).

See also: [[Game metadata]], [[Saving and loading]], [[Localization]] (publishing a translated copy).
