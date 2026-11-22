"""Project-scoped views over the same game.json the browser editor saves."""

import hashlib
import json
from itertools import islice
from pathlib import Path

from jsonpatch import JsonPatch, JsonPatchException
from jsonpointer import JsonPointer, JsonPointerException
from jsonschema import Draft7Validator

from app import ownership
from app.api.v1 import projects

PLANES = {
    "dialog": ["dialogs"],
    "config": ["general", "startupDialog", "startMenu", "situations", "translations", "config", "dev"],
    "visuals": ["visuals"],
    "locs": ["locs"],
    "chars": ["chars", "roles"],
    "scripts": ["props", "functions", "events", "eventHosts", "hooks"],
    "facts": ["facts", "objectives"],
    "items": ["items"],
    "ui": ["uiElements"],
    "special": ["pacWidgets"],
}
DEFINITIONS = json.loads(Path(__file__).with_name("schema.json").read_text())["definitions"]
FIELDS = DEFINITIONS["GameDescription"]["properties"]
MAX_FRAGMENT = 12000


def component(name):
    if not name or name in {".", ".."} or "/" in name or "\\" in name or "\x00" in name:
        raise ValueError("Expected a single name")
    return name


def owned_game(project, user):
    base = projects._projects_base()
    directory = base / component(project)
    path = directory / "game.json"
    if (
        directory.resolve() != directory
        or path.is_symlink()
        or not path.is_file()
        or ownership.get_owner(project) != user
    ):
        raise ValueError("Owned game not found")
    return path


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode()


def portion(project, user, plane, field):
    if field not in PLANES.get(plane, ()):
        raise ValueError("Unknown plane or field. Use editor_planes.")
    game = json.loads(owned_game(project, user).read_bytes())
    # Older games omit fields introduced in later engine versions.
    value = game.get(field, [] if FIELDS[field].get("type") == "array" else {})
    return game, value


def revision(value):
    return hashlib.sha256(encoded(value)).hexdigest()


def resolve(value, path):
    try:
        return JsonPointer(path).resolve(value)
    except (JsonPointerException, TypeError, IndexError):
        raise ValueError("Unknown JSON Pointer. Browse its parent.") from None


def describe(value):
    if isinstance(value, list):
        return {"type": "array", "length": len(value)}
    if isinstance(value, dict):
        label = next(
            (value[k][:100] for k in ("uid", "id", "name", "text") if isinstance(value.get(k), str)), None
        )
        return {"type": "object", "keys": len(value), **({"label": label} if label else {})}
    return value[:100] if isinstance(value, str) else value


def browse(value, path, offset, limit):
    node = resolve(value, path)
    if isinstance(node, dict):
        pairs = node.items()
    elif isinstance(node, list):
        pairs = enumerate(node)
    else:
        return {"summary": describe(node)}
    entries = []
    for key, child in islice(pairs, offset, offset + limit):
        token = str(key).replace("~", "~0").replace("/", "~1")
        entries.append({"path": f"{path}/{token}", "summary": describe(child)})
    return {"entries": entries, "total": len(node)}


def patch(project, user, plane, field, expected_revision, operations):
    if len(encoded(operations)) > 128 * 1024 or not 1 <= len(operations) <= 64:
        raise ValueError("Send 1–64 operations totaling at most 128 KiB")
    with projects.project_write_lock():
        game, value = portion(project, user, plane, field)
        if revision(value) != expected_revision:
            raise ValueError("Field changed. Browse again before retrying.")
        validator = Draft7Validator({**FIELDS[field], "definitions": DEFINITIONS})

        # Legacy fields may predate required properties in the current schema.
        # Accept pre-existing diagnostics while rejecting newly introduced ones.
        def diagnostic(error):
            return (error.json_path, tuple(error.absolute_schema_path), error.message)

        previous_errors = {diagnostic(err) for err in validator.iter_errors(value)}
        # Work only on this in-memory field. Discard it if any operation fails.
        for i, op in enumerate(operations):
            if op.get("op") not in ("add", "remove", "replace", "move", "copy", "test"):
                raise ValueError(f"Unknown JSON Patch operation at index {i}")
            try:
                if op["op"] == "copy" and len(encoded(resolve(value, op["from"]))) > 128 * 1024:
                    raise ValueError("Copy a smaller portion")
                value = JsonPatch([op]).apply(value, in_place=True)
            except (JsonPatchException, JsonPointerException, ValueError, TypeError, KeyError, IndexError):
                raise ValueError(
                    f"Operation {i} failed. Check its field-relative pointer and value."
                ) from None
        error = next(
            (err for err in validator.iter_errors(value) if diagnostic(err) not in previous_errors), None
        )
        if error:
            raise ValueError(
                f"Invalid {field}{error.json_path[1:]} ({error.validator}: {str(error.validator_value)[:200]})"
            )
        game[field] = value
        projects.persist_game(project, user, game, encoded(game))
    return {"revision": revision(value), "applied": len(operations)}
