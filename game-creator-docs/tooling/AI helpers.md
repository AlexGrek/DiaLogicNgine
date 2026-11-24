---
tags: [tooling, ai]
verified: 2026-11-24
sources: dialogic/src/components/common/LlmTextarea.tsx, dialogic/src/components/ai/AiGenerateDrawer.tsx, dialogic/src/components/DialogEditor.tsx, dialogic/src/components/common/ImagePicker.tsx, ImagePickerModal.tsx, imggen/*, dialogic/src/components/menuitems/ResourcesMenu.tsx, dialogic/src/components/menuitems/configuration/ConfigurationMenu.tsx, backend/app/api/v1/llm.py, offloadmq.py, prompts.py
---
# AI helpers

The editor can draft **text**, **dialog scenes** and **images** with AI models. Everything AI produces lands in the normal fields, where
you edit it like anything you wrote yourself; the game never calls AI at play time.

**Requirement:** the server must be connected to an AI backend (OffloadMQ). Without one, the model lists stay empty and generation fails
with *OffloadMQ not configured*. The available models depend on that backend.

## Text fields: "Generate with AI"

Most story text editors (window text, location text, character names and descriptions, character dialog text, text variants) have a
**Generate with AI** button next to the text box:

1. Pick an **LLM model**.
2. Describe what to write (*Describe what to generate…*).
3. **Generate**: the result **replaces** the text in the box.

The model is told to act as a concise creative-writing assistant for a visual novel and to return only the text. It does **not** see the
rest of your game, so put the context (who speaks, what happened, the tone) into the prompt.

## Dialog scenes: "Generate"

In the [[Dialogs|dialog editor]], **Generate** drafts a whole branch:

| Field | Meaning |
|---|---|
| **Model** | LLM to use |
| uid prefix (e.g. *shopkeeper*) | prefix for the new window uids |
| **Prompt** | *Describe the scene or conversation to generate…* |

The model returns 3–8 windows, each with text and choices, and they are **added** to the current dialog as new windows with [[Local]]
links between them. Uids are made unique against the existing windows. Afterwards:

* connect the new branch to your existing windows yourself (nothing links *into* it);
* the windows have no actors, backgrounds or scripts;
* a choice whose target the model invented without creating it becomes a link to a missing window. Run the [[Sanity check]].

## Images

Every image picker (backgrounds, avatars, item images, location thumbnails, PAC backgrounds…) opens **Select Image** with these sources:

| Source | Does |
|---|---|
| **Server Uploads** | images already in this project; **Upload image** adds files |
| **Local Assets** | images bundled with the editor (stored as `game_assets/<file>`) |
| **Other Projects** | browse your other projects' images. **Careful:** only the file name is stored and nothing is copied, so the picture is missing in this project unless a file of that name exists here (from source); the [[Sanity check]] reports it. Download and re-upload instead (`dialogic assets pull` / `push`). |
| **Generate** | text-to-image: **Model**, **Prompt**, **Negative prompt**, **Size** / **Width** / **Height**, **Seed (optional)**, optional **Input image**, plus advanced options |
| **From source** | make an image from another one: resize or crop, or image-to-image with a **Prompt**. Typical use: a square thumbnail from a big picture. |

Generated images are saved into the project and can be selected like uploads.

### Quick AI buttons and the prompt suffix

Some pickers have a one-click **AI Generate** button with a ready prompt built from the object, e.g. *"&lt;character&gt;, character
portrait, face"*, *"&lt;location&gt;, location background scene, wide angle"*, *"&lt;item&gt;, inventory item thumbnail, square"*.

**Game properties → Developer / AI → Basic prompt suffix** is appended to every such quick prompt, e.g. *"1990s Soviet apartment, muted
film photo"*. Set it once to keep a consistent art style across the game. It is stored as `dev.basicPromptSuffix` and never affects
gameplay.

## Prompt history

Prompts you send are stored per project. Sidebar **Resources** has two tabs: **Images** (every uploaded file, with delete, *delete
unused* and a hard cleanup) and **AI prompts** (stored prompts, deletable one by one or all at once).

## Outside the editor

For bulk work (dozens of backgrounds, a full translation) an AI agent can drive the game through the MCP servers or the CLI instead
([[MCP servers]], [[Dialogic CLI]]). Images generated elsewhere are uploaded with `dialogic assets push`, at full resolution.

See also: [[Game metadata]], [[Backgrounds]], [[Localization]].
