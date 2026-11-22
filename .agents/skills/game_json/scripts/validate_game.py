#!/usr/bin/env python3
"""Offline reference validator for DiaLogicNgine game.json files.

Checks a hand-edited game file for the things the JSON format cannot express:
dangling UID references, malformed quest paths, undeclared props/facts/items used
by scripts, and structural mistakes that only surface when a player walks into
them.

It mirrors `dialogic/src/game/sanityCheck.ts` (the in-editor Sanity check) and
adds checks that only matter when editing JSON by hand. It cannot check image
files — those live on the server; use the editor's Sanity check tab for that.

    python3 validate_game.py path/to/game.json [--strict]

    --strict   exit non-zero on warnings too

Exit code: 0 = no errors, 1 = errors found, 2 = file could not be read.
"""

import json
import re
import sys

IDENT = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")

CURRENT_ENGINE = "0.21"

REQUIRED_KEYS = [
    "engineVersion", "buildVersion", "general", "startupDialog", "startMenu",
    "config", "dev", "visuals", "translations", "dialogs", "chars", "roles",
    "locs", "props", "facts", "items", "objectives", "events", "eventHosts",
    "situations", "pacWidgets", "uiElements", "hooks", "functions",
]

LINK_TYPES = {"local", "push", "pop", "jump", "resetjump", "tolocation",
              "toperson", "reply", "return"}
QUALIFIED_TYPES = {"push", "jump", "resetjump"}
PROP_DATATYPES = {"number", "string", "boolean", "variant", "location"}

SCRIPT_KEYS = {
    "actionCode", "isVisible", "isEnabled", "useAlternativeWhen",
    "textProcessingCode", "body", "onComplete", "onFail", "onOpen", "value",
}
OBJECTIVE_METHODS = {"open", "close", "complete", "fail", "status",
                     "isCompleted", "isFailed", "isOpen"}


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, where, message):
        self.errors.append((where, message))

    def warn(self, where, message):
        self.warnings.append((where, message))


def is_script_key(key):
    return key in SCRIPT_KEYS or key.endswith("Script")


def walk_scripts(value, path=""):
    """Yield (json_path, script_source) for every script-bearing string leaf."""
    if isinstance(value, dict):
        for k, v in value.items():
            here = f"{path}.{k}" if path else k
            if isinstance(v, str):
                if is_script_key(k) and v.strip():
                    yield here, v
            else:
                yield from walk_scripts(v, here)
    elif isinstance(value, list):
        for i, item in enumerate(value):
            yield from walk_scripts(item, f"{path}[{i}]")


def dupes(names):
    seen, dup = set(), []
    for n in names:
        if n in seen and n not in dup:
            dup.append(n)
        seen.add(n)
    return dup


def validate(game, rep):
    # ── Top-level shape ──────────────────────────────────────────────────────
    # A file written for an older engine is migrated on load (Patches.ts), so a
    # key it predates is only worth a warning; a current-version file must be complete.
    version = game.get("engineVersion")
    outdated = isinstance(version, str) and version != CURRENT_ENGINE
    for key in REQUIRED_KEYS:
        if key not in game:
            if outdated:
                rep.warn("(root)", f'missing top-level key "{key}" — the loader will add it '
                                   f"when migrating from engineVersion {version} to {CURRENT_ENGINE}")
            else:
                rep.error("(root)", f'missing required top-level key "{key}"')
    if not isinstance(game.get("engineVersion"), str):
        rep.error("(root)", 'engineVersion must be a string (e.g. "0.21") — the '
                            "game will not load without it")

    dialogs = game.get("dialogs") or []
    chars = game.get("chars") or []
    roles = game.get("roles") or []
    locs = game.get("locs") or []
    props = game.get("props") or []
    facts = game.get("facts") or []
    items = game.get("items") or []
    objectives = game.get("objectives") or []
    events = game.get("events") or []
    pacs = game.get("pacWidgets") or []
    hooks = game.get("hooks") or []
    functions = game.get("functions") or []
    situations = set(game.get("situations") or [])
    event_hosts = set(game.get("eventHosts") or [])
    meters = (game.get("uiElements") or {}).get("meters") or []

    # ── Lookup tables ────────────────────────────────────────────────────────
    windows_by_dialog = {d.get("name"): {w.get("uid") for w in (d.get("windows") or [])}
                         for d in dialogs}
    dialog_names = set(windows_by_dialog)
    char_uids = {c.get("uid") for c in chars}
    chars_with_dialog = {c.get("uid") for c in chars if c.get("dialog")}
    loc_uids = {l.get("uid") for l in locs}
    item_uids = {i.get("uid") for i in items}
    fact_uids = {f.get("uid") for f in facts}
    prop_names = {p.get("name") for p in props}
    role_names = {r.get("name") for r in roles}
    pac_ids = {p.get("id") for p in pacs}
    quest_index = {}   # (line, quest) -> quest dict
    task_index = {}    # (line, quest, task) -> task dict
    line_index = {q.get("uid"): q for q in objectives}

    # every place a dialog window can be reached from
    inbound_windows = set()

    # ── Duplicates ───────────────────────────────────────────────────────────
    for label, names in [
        ("dialog name", [d.get("name") for d in dialogs]),
        ("character uid", [c.get("uid") for c in chars]),
        ("role name", [r.get("name") for r in roles]),
        ("location uid", [l.get("uid") for l in locs]),
        ("prop name", [p.get("name") for p in props]),
        ("fact uid", [f.get("uid") for f in facts]),
        ("item uid", [i.get("uid") for i in items]),
        ("point-and-click id", [p.get("id") for p in pacs]),
        ("questline uid", [o.get("uid") for o in objectives]),
        ("meter uid", [m.get("uid") for m in meters]),
        ("function name", [f.get("name") for f in functions]),
    ]:
        for d in dupes([n for n in names if n is not None]):
            rep.error("(root)", f'duplicate {label} "{d}"')
    for d in dialogs:
        for dup in dupes([w.get("uid") for w in (d.get("windows") or [])]):
            rep.error(f'dialog "{d.get("name")}"', f'duplicate window uid "{dup}"')

    # ── Identifier-shaped uids (needed for rt.* access) ──────────────────────
    for p in props:
        if not IDENT.match(str(p.get("name") or "")):
            rep.warn("props", f'prop name "{p.get("name")}" is not a JS identifier — '
                              "rt.props.<name> will not work")
    for f in facts:
        if not IDENT.match(str(f.get("uid") or "")):
            rep.warn("facts", f'fact uid "{f.get("uid")}" is not a JS identifier — '
                              "rt.facts.<uid> will not work")

    # ── Link checking ────────────────────────────────────────────────────────
    def check_qualified(qd, where, what):
        if not isinstance(qd, dict) or not qd.get("dialog") or not qd.get("window"):
            rep.error(where, f"{what} has no qualifiedDirection target set")
            return
        d, w = qd.get("dialog"), qd.get("window")
        inbound_windows.add((d, w))
        if d not in dialog_names:
            rep.error(where, f'{what} points to missing dialog "{d}"')
        elif w not in windows_by_dialog[d]:
            rep.error(where, f'{what} points to missing window "{w}" in dialog "{d}"')

    def check_direction(direction, where, dialog_name=None, what="link"):
        if not isinstance(direction, dict):
            rep.error(where, f"{what} direction is not an object")
            return
        t = direction.get("type")
        if t not in LINK_TYPES:
            rep.error(where, f'unknown link type "{t}" '
                             f"(expected one of {', '.join(sorted(LINK_TYPES))})")
            return
        target = direction.get("direction")
        if t == "local":
            if not target:
                rep.warn(where, f"{what} of type local has no target window")
            elif dialog_name is None:
                rep.warn(where, f'local link "{target}" is used outside a dialog; it '
                                "resolves against whatever dialog hosts it at runtime")
            else:
                inbound_windows.add((dialog_name, target))
                if target not in windows_by_dialog.get(dialog_name, set()):
                    rep.error(where, f'local link points to missing window "{target}" '
                                     f'in dialog "{dialog_name}"')
        elif t in QUALIFIED_TYPES:
            check_qualified(direction.get("qualifiedDirection"), where, f"{t} link")
        elif t == "tolocation":
            if not target:
                rep.warn(where, "location link has no target")
            elif target not in loc_uids:
                rep.error(where, f'location link points to missing location "{target}"')
        elif t == "toperson":
            if not target:
                rep.warn(where, "talk-to-person link has no target")
            elif target not in char_uids:
                rep.error(where, f'talk-to-person link points to missing character "{target}"')
            elif target not in chars_with_dialog:
                rep.error(where, f'talk-to-person link targets character "{target}", which '
                                 "has no `dialog` — the player would land on an empty screen")
        elif t == "reply":
            if not direction.get("replyText"):
                rep.warn(where, "quick-reply link has no replyText")

    def check_link(link, where, dialog_name=None):
        if not isinstance(link, dict):
            rep.error(where, "link is not an object")
            return
        check_direction(link.get("mainDirection"), where, dialog_name)
        alts = link.get("alternativeDirections") or []
        for i, alt in enumerate(alts):
            check_direction(alt, f"{where} → alternative {i + 1}", dialog_name)
        if link.get("useAlternativeWhen") and not alts:
            rep.warn(where, "useAlternativeWhen is set but alternativeDirections is empty")
        if alts and not link.get("useAlternativeWhen") and link.get("isAlternativeLink"):
            rep.warn(where, "isAlternativeLink is set but useAlternativeWhen is missing")
        bg = link.get("changeLocationInBg")
        if bg and bg not in loc_uids:
            rep.error(where, f'changeLocationInBg points to missing location "{bg}"')

    # ── Dialogs / windows ────────────────────────────────────────────────────
    for d in dialogs:
        dname = d.get("name")
        for w in (d.get("windows") or []):
            where = f'dialog "{dname}" → window "{w.get("uid")}"'
            links = w.get("links")
            if links is None:
                rep.error(where, "missing required field `links` (use [] for none)")
                links = []
            for i, link in enumerate(links):
                check_link(link, f"{where} → link {i + 1}", dname)
            for field in ("text", "backgrounds", "tags"):
                if field not in w:
                    rep.error(where, f"missing required field `{field}`")
            if "specialWidget" not in w:
                rep.error(where, "missing required field `specialWidget` (use null)")
            if not links:
                rep.warn(where, "window has no links — the player cannot leave it")
            actor = w.get("actor")
            if isinstance(actor, dict) and actor.get("character") \
                    and not actor.get("currentCharacter") \
                    and actor["character"] not in char_uids:
                rep.error(where, f'actor references missing character "{actor["character"]}"')
            bg = w.get("changeLocationInBg")
            if bg and bg not in loc_uids:
                rep.error(where, f'changeLocationInBg points to missing location "{bg}"')
            sit = w.get("changeSituation")
            if sit:
                if sit not in situations:
                    rep.warn(where, f'changeSituation "{sit}" is not declared in `situations`')
                rep.warn(where, "changeSituation is not applied by the engine — set "
                                "state.situation from a script instead")
            sw = w.get("specialWidget")
            if sw:
                kind, _, wid = str(sw).partition("::")
                if kind != "pac" or not wid:
                    rep.error(where, f'specialWidget "{sw}" is malformed (expected "pac::<id>")')
                elif wid not in pac_ids:
                    rep.error(where, f'specialWidget points to missing point-and-click widget "{wid}"')

    # ── Locations ────────────────────────────────────────────────────────────
    for l in locs:
        where = f'location "{l.get("uid")}"'
        for i, link in enumerate(l.get("links") or []):
            check_link(link, f"{where} → link {i + 1}")
        for r in (l.get("routes") or []):
            if r not in loc_uids:
                rep.error(f"{where} → routes", f'route points to missing location "{r}"')
            elif l.get("uid") not in ((next((x for x in locs if x.get("uid") == r), {})).get("routes") or []):
                rep.warn(f"{where} → routes", f'route to "{r}" is one-way — "{r}" has no '
                                              f'route back to "{l.get("uid")}"')
        for g in (l.get("goto") or []):
            if g not in loc_uids:
                rep.error(f"{where} → goto", f'goto points to missing location "{g}"')
        hosts = l.get("eventHosts")
        if isinstance(hosts, list):
            for h in hosts:
                if h not in event_hosts:
                    rep.warn(where, f'eventHost "{h}" is not declared in the top-level `eventHosts`')

    # ── Characters ───────────────────────────────────────────────────────────
    for c in chars:
        where = f'character "{c.get("uid")}"'
        for r in (c.get("roles") or []):
            if r not in role_names:
                rep.error(where, f'references missing role "{r}"')
        dialog = c.get("dialog")
        if not dialog:
            continue
        for i, link in enumerate(dialog.get("links") or []):
            check_link(link, f"{where} → dialog link {i + 1}")
        if not (dialog.get("links") or []):
            rep.warn(f"{where} → dialog", "conversation has no links — the player cannot "
                                          "leave it (add a pop or return link)")
        hosts = dialog.get("eventHosts")
        if isinstance(hosts, list):
            for h in hosts:
                if h not in event_hosts:
                    rep.warn(where, f'eventHost "{h}" is not declared in the top-level `eventHosts`')
        for i, reaction in enumerate(dialog.get("behavior", {}).get("reactions") or []):
            rwhere = f"{where} → reaction {i + 1}"
            trigger = reaction.get("trigger") or {}
            for kind, known in (("facts", fact_uids), ("chars", char_uids),
                                ("items", item_uids), ("places", loc_uids)):
                for uid in (trigger.get(kind) or []):
                    if uid not in known:
                        rep.error(rwhere, f'trigger.{kind} references missing "{uid}"')
            if not any(trigger.get(k) for k in ("facts", "chars", "items", "places")):
                rep.warn(rwhere, "reaction has no triggers — it can never match")
            if reaction.get("dialogWindow"):
                check_qualified(reaction["dialogWindow"], rwhere, "reaction window")
            elif not reaction.get("reply"):
                rep.warn(rwhere, "reaction has neither reply text nor dialogWindow")

    # ── Startup ──────────────────────────────────────────────────────────────
    su = game.get("startupDialog")
    if not isinstance(su, dict):
        rep.error("(root)", "startupDialog is missing or not an object")
    else:
        if su.get("kind") != "window":
            rep.error("startupDialog", 'kind must be "window"')
        check_qualified(su, "startupDialog", "startup dialog")

    # ── Events ───────────────────────────────────────────────────────────────
    implicit_hosts = {f"loc:{u}" for u in loc_uids} | {f"char:{u}" for u in char_uids}
    for e in events:
        where = f'event "{e.get("name")}"'
        if not e.get("name"):
            rep.error("events", "event has no name (it is the key used by rt.history)")
        if e.get("link"):
            check_qualified(e["link"], where, "event link")
        else:
            rep.warn(where, "event has no link — firing it does nothing")
        targets = e.get("targets") or []
        if not targets:
            rep.warn(where, "event has no targets — it can never fire")
        for t in targets:
            if t not in event_hosts and t not in implicit_hosts:
                rep.error(where, f'targets unknown event host "{t}" (declare it in '
                                 "`eventHosts`, or use loc:<uid> / char:<uid>)")
        prob = e.get("probability")
        if not isinstance(prob, (int, float)) or not (0 <= prob <= 100):
            rep.warn(where, f"probability {prob!r} is outside 0–100")
        hosted_by_loc = any(
            (isinstance(l.get("eventHosts"), list)
             and (set(l["eventHosts"]) & set(targets)
                  or f'loc:{l.get("uid")}' in targets))
            for l in locs)
        if targets and not hosted_by_loc:
            rep.warn(where, "no location hosts any of this event's targets — events only "
                            "roll on location entry, so it can never fire")

    # ── Point-and-click ──────────────────────────────────────────────────────
    for pac in pacs:
        for z in (pac.get("zones") or []):
            where = f'point-and-click "{pac.get("id")}" → zone "{z.get("name") or z.get("id")}"'
            for field in ("x", "y", "width", "height"):
                v = z.get(field)
                if not isinstance(v, (int, float)):
                    rep.error(where, f"`{field}` must be a number (percent of the screen)")
                elif not (0 <= v <= 100):
                    rep.warn(where, f"`{field}` = {v} is outside 0–100 (values are percentages)")
            md = z.get("mainDirection")
            if md:
                check_direction(md, f"{where} → click", None, "zone")
            for i, alt in enumerate(z.get("alternativeDirections") or []):
                check_direction(alt, f"{where} → alternative {i + 1}", None, "zone")
            if not md and not z.get("onClickScript"):
                rep.warn(where, "zone neither navigates nor runs a script — clicking does nothing")
        hosts = pac.get("eventHosts")
        if isinstance(hosts, list):
            for h in hosts:
                if h not in event_hosts:
                    rep.warn(f'point-and-click "{pac.get("id")}"',
                             f'eventHost "{h}" is not declared in the top-level `eventHosts`')

    # ── Props ────────────────────────────────────────────────────────────────
    def check_prop(p, where):
        dt = p.get("datatype")
        if dt not in PROP_DATATYPES:
            rep.error(where, f'prop "{p.get("name")}" has unknown datatype "{dt}"')
            return
        if "defaultValue" not in p:
            rep.error(where, f'prop "{p.get("name")}" has no defaultValue')
            return
        dv = p["defaultValue"]
        if dt == "variant":
            variants = p.get("variants")
            if not isinstance(variants, list) or not variants:
                rep.error(where, f'variant prop "{p.get("name")}" has no variants')
            elif dv not in variants:
                rep.error(where, f'variant prop "{p.get("name")}" defaultValue "{dv}" is '
                                 f"not one of {variants}")
        elif dt == "number" and not isinstance(dv, (int, float)):
            rep.error(where, f'number prop "{p.get("name")}" has non-number defaultValue {dv!r}')
        elif dt == "boolean" and not isinstance(dv, bool):
            rep.error(where, f'boolean prop "{p.get("name")}" has non-boolean defaultValue {dv!r}')
        elif dt == "location" and dv and dv not in loc_uids:
            rep.error(where, f'location prop "{p.get("name")}" defaults to missing location "{dv}"')

    for p in props:
        check_prop(p, "props")
    for r in roles:
        for p in (r.get("props") or []):
            check_prop(p, f'role "{r.get("name")}"')
    for c in chars:
        for key in ("props", "overrideProps"):
            for p in (c.get(key) or []):
                check_prop(p, f'character "{c.get("uid")}" → {key}')

    # ── Objectives ───────────────────────────────────────────────────────────
    for line in objectives:
        luid = line.get("uid")
        lwhere = f'questline "{luid}"'
        if not IDENT.match(str(luid or "")):
            rep.warn(lwhere, "questline uid is not a JS identifier — rt.objectives.<uid> "
                             "will not work")
        for dup in dupes([q.get("uid") for q in (line.get("quests") or [])]):
            rep.error(lwhere, f'duplicate quest uid "{dup}"')
        for q in (line.get("quests") or []):
            quid = q.get("uid")
            qwhere = f'{lwhere} → quest "{quid}"'
            quest_index[(luid, quid)] = q
            if not IDENT.match(str(quid or "")):
                rep.warn(qwhere, "quest uid is not a JS identifier")
            if q.get("path") != [luid, quid]:
                rep.error(qwhere, f'path {q.get("path")!r} must be ["{luid}", "{quid}"] — '
                                  "quest tracking keys off it")
            if q.get("ordered") is not True:
                rep.error(qwhere, "`ordered` must be true (the model allows no other value)")
            for dup in dupes([t.get("uid") for t in (q.get("tasks") or [])]):
                rep.error(qwhere, f'duplicate task uid "{dup}"')
            if not (q.get("tasks") or []):
                rep.warn(qwhere, "quest has no tasks — it can never complete on its own")
            for t in (q.get("tasks") or []):
                tuid = t.get("uid")
                twhere = f'{qwhere} → task "{tuid}"'
                task_index[(luid, quid, tuid)] = t
                if not IDENT.match(str(tuid or "")):
                    rep.warn(twhere, "task uid is not a JS identifier")
                if t.get("path") != [luid, quid, tuid]:
                    rep.error(twhere, f'path {t.get("path")!r} must be '
                                      f'["{luid}", "{quid}", "{tuid}"]')
                if not t.get("text"):
                    rep.warn(twhere, "task has no text — nothing to show in the journal")

    # ── Hooks ────────────────────────────────────────────────────────────────
    hook_specs = [
        ("FACTS::DISCOVERED::", 1, lambda p: p[0] in fact_uids, "fact"),
        ("ITEMS::ACQUIRED::", 1, lambda p: p[0] in item_uids, "item"),
        ("ITEMS::LOST::", 1, lambda p: p[0] in item_uids, "item"),
        ("SITUATION::STARTED::", 1, lambda p: p[0] in situations, "situation"),
        ("SITUATION::ENDED::", 1, lambda p: p[0] in situations, "situation"),
        ("QUESTLINE::OPENED::", 1, lambda p: p[0] in line_index, "questline"),
        ("QUESTLINE::CLOSED::", 1, lambda p: p[0] in line_index, "questline"),
        ("QUEST::OPENED::", 2, lambda p: tuple(p) in quest_index, "quest"),
        ("QUEST::COMPLETED::", 2, lambda p: tuple(p) in quest_index, "quest"),
        ("QUEST::FAILED::", 2, lambda p: tuple(p) in quest_index, "quest"),
        ("TASK::OPENED::", 3, lambda p: tuple(p) in task_index, "task"),
        ("TASK::COMPLETED::", 3, lambda p: tuple(p) in task_index, "task"),
        ("TASK::FAILED::", 3, lambda p: tuple(p) in task_index, "task"),
    ]
    for h in hooks:
        where = f'hook "{h.get("name") or h.get("hook")}"'
        hook = h.get("hook") or ""
        if not hook:
            rep.error(where, "hook has no `hook` string — it can never fire")
            continue
        if not h.get("body"):
            rep.warn(where, "hook has an empty body")
        for prefix, arity, exists, label in sorted(hook_specs, key=lambda s: -len(s[0])):
            if hook.startswith(prefix):
                parts = hook[len(prefix):].split("::")
                if len(parts) != arity or not all(parts):
                    rep.error(where, f'hook string "{hook}" should end with {arity} '
                                     f'"::"-separated {label} id(s)')
                elif not exists(parts):
                    rep.error(where, f'hook targets missing {label} "{"::".join(parts)}"')
                break
        else:
            rep.error(where, f'unknown hook string "{hook}" — see references/scripting.md '
                             "for the valid prefixes")

    # ── Functions & meters ───────────────────────────────────────────────────
    for f in functions:
        if not IDENT.match(str(f.get("name") or "")):
            rep.error("functions", f'function name "{f.get("name")}" is not a JS identifier — '
                                   "it is skipped silently at runtime")
        if not f.get("body"):
            rep.warn(f'function "{f.get("name")}"', "function has an empty body")
    for m in meters:
        where = f'meter "{m.get("uid")}"'
        if "layout" not in m:
            rep.error(where, "missing required field `layout` (use { \"opacity\": 1 })")
        if "progressBar" not in m:
            rep.error(where, "missing required field `progressBar` (use null for a plain readout)")
        if not m.get("value"):
            rep.warn(where, "meter has no `value` script — it will show nothing")
        pb = m.get("progressBar")
        if isinstance(pb, dict) and pb.get("min") is not None and pb.get("max") is not None \
                and pb["min"] >= pb["max"]:
            rep.error(where, f'progressBar min ({pb["min"]}) must be below max ({pb["max"]})')

    # ── Scripts: referenced state must be declared ───────────────────────────
    for where, src in walk_scripts(game):
        for name in re.findall(r"\brt\.props\.([A-Za-z_$][\w$]*)", src):
            if name not in prop_names:
                rep.warn(where, f'script uses rt.props.{name}, which is not declared in '
                                "`props` — writes to it are silently lost")
        for name in re.findall(r"\brt\.facts\.([A-Za-z_$][\w$]*)", src):
            if name not in fact_uids:
                rep.error(where, f'script uses rt.facts.{name}, which is not declared in '
                                 "`facts` — it will throw at runtime")
        for uid in re.findall(r"\brt\.items\.(?:add|remove|has|count)\(\s*['\"]([^'\"]+)['\"]", src):
            if uid not in item_uids:
                rep.error(where, f'script references missing item "{uid}"')
        for uid in re.findall(r"\brt\.ch\.([A-Za-z_$][\w$]*)", src):
            if uid not in char_uids:
                rep.error(where, f'script references missing character "{uid}" via rt.ch')
        for match in re.finditer(r"\brt\.objectives\.([A-Za-z_$][\w$.]*)", src):
            parts = [p for p in match.group(1).split(".") if p]
            while parts and parts[-1] in OBJECTIVE_METHODS:
                parts.pop()
            if not parts:
                continue
            if parts[0] not in line_index:
                rep.error(where, f'script references missing questline "{parts[0]}"')
            elif len(parts) >= 2 and (parts[0], parts[1]) not in quest_index:
                rep.error(where, f'script references missing quest "{parts[0]}.{parts[1]}"')
            elif len(parts) >= 3 and tuple(parts[:3]) not in task_index:
                rep.error(where, f'script references missing task "{".".join(parts[:3])}"')
        for sit in re.findall(r"\bstate\.situation\s*=\s*['\"]([^'\"]+)['\"]", src):
            if sit not in situations:
                rep.warn(where, f'script sets situation "{sit}", which is not declared in '
                                "`situations`")

    # ── Unreachable windows ──────────────────────────────────────────────────
    for d in dialogs:
        for w in (d.get("windows") or []):
            if (d.get("name"), w.get("uid")) not in inbound_windows:
                rep.warn(f'dialog "{d.get("name")}" → window "{w.get("uid")}"',
                         "nothing links to this window (no link, event, reaction or "
                         "startupDialog targets it)")


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    path = argv[1]
    strict = "--strict" in argv[2:]
    try:
        with open(path, encoding="utf-8") as fh:
            game = json.load(fh)
    except OSError as exc:
        print(f"cannot read {path}: {exc}")
        return 2
    except json.JSONDecodeError as exc:
        print(f"{path} is not valid JSON: line {exc.lineno} column {exc.colno}: {exc.msg}")
        return 2
    if not isinstance(game, dict):
        print(f"{path} does not contain a game object")
        return 2

    rep = Report()
    validate(game, rep)

    for where, msg in rep.errors:
        print(f"ERROR  {where}: {msg}")
    for where, msg in rep.warnings:
        print(f"WARN   {where}: {msg}")
    print(f"\n{len(rep.errors)} error(s), {len(rep.warnings)} warning(s) in {path}")
    if rep.errors:
        return 1
    return 1 if (strict and rep.warnings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
