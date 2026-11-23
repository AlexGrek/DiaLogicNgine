"""HTTP integration tests through the same MCP, OAuth and REST routes clients use."""

import asyncio
import base64
import hashlib
import json
import socket
import threading
import time
import unittest
from contextlib import ExitStack
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import httpx
import uvicorn
from app import auth, image_storage, ownership
from app.api.v1 import projects
from app.game_mcp import authorization
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from PIL import Image


class GameEditingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        stack = ExitStack()
        cls.addClassCleanup(stack.close)
        storage = Path(stack.enter_context(TemporaryDirectory()))
        for module, attrs in [
            (projects, {"STORAGE_ROOT": storage}),
            (image_storage, {"STORAGE_ROOT": storage}),
            (ownership, {"PROJECTS_DIR": storage / "projects"}),
            (
                auth,
                {
                    "AUTH_DIR": storage / "auth",
                    "PROJECTS_DIR": storage / "projects",
                    "USERS_FILE": storage / "auth/users.json",
                    "SECRET_FILE": storage / "auth/secret",
                },
            ),
            (authorization, {"KEYS": {"alice": "alice-test", "boris": "boris-test"}}),
        ]:
            stack.enter_context(patch.multiple(module, **attrs))
        listener = stack.enter_context(socket.socket())
        listener.bind(("127.0.0.1", 0))
        origin = f"http://127.0.0.1:{listener.getsockname()[1]}"
        stack.enter_context(patch.multiple(authorization, ORIGIN=origin, RESOURCE=origin + "/mcp"))
        from app.game_mcp.server import security
        from app.main import app

        stack.enter_context(patch.object(security, "allowed_hosts", [urlsplit(origin).netloc]))
        server = uvicorn.Server(uvicorn.Config(app, access_log=False, log_level="warning"))
        thread = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
        thread.start()

        def stop():
            server.should_exit = True
            thread.join(5)

        stack.callback(stop)
        for _ in range(200):
            if server.started:
                break
            time.sleep(0.025)
        if not server.started:
            raise RuntimeError("Test server failed to start")
        cls.http = stack.enter_context(httpx.Client(base_url=origin, follow_redirects=True, trust_env=False))
        for username in ("boris", "alice"):
            cls.http.post(
                "/api/v1/auth/register", json={"username": username, "password": "testing"}
            ).raise_for_status()
        cls.headers = {"Accept": "application/json, text/event-stream", "X-API-Key": "alice-test"}

    def rpc(self, method, params, headers=None):
        response = self.http.post(
            "/mcp",
            headers=headers or self.headers,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        )
        response.raise_for_status()
        return response.json()["result"]

    def tool(self, name, **args):
        result = self.rpc("tools/call", {"name": name, "arguments": args})
        content = result["content"][0]
        if not result["isError"] and content["type"] == "text":
            result["decoded"] = json.loads(content["text"])
        return result

    def test_edit_and_images(self):
        game = {"general": {"name": "Before"}, "dialogs": [], "unknown": "preserved"}
        route = "/api/v1/projects/demo"
        self.http.put(route + "/game", json=game).raise_for_status()
        self.http.post(route + "/publish", json={"published": True}).raise_for_status()
        self.assertEqual(self.http.post("/mcp", json={}).status_code, 401)
        self.rpc(
            "initialize",
            {
                "protocolVersion": "2025-11-25",
                "capabilities": {},
                "clientInfo": {"name": "test", "version": "1"},
            },
        )
        self.assertIn("patch_field", [t["name"] for t in self.rpc("tools/list", {})["tools"]])
        self.assertIn("demo", self.tool("list_projects")["decoded"]["projects"])
        args = {"project": "demo", "plane": "config", "field": "general"}
        read = self.tool("browse_field", **args)["decoded"]
        self.assertEqual(read["entries"][0]["path"], "/name")
        rev = read["revision"]
        edit = {"op": "replace", "path": "/name", "value": "After"}
        for bad in ({"op": "remove", "path": "/missing"}, {"op": "add", "path": "/authors", "value": 7}):
            self.assertTrue(self.tool("patch_field", **args, revision=rev, operations=[edit, bad])["isError"])
        self.assertFalse(self.tool("patch_field", **args, revision=rev, operations=[edit])["isError"])
        self.assertTrue(self.tool("patch_field", **args, revision=rev, operations=[edit])["isError"])
        self.assertEqual(self.http.get(route + "/game").json(), {**game, "general": {"name": "After"}})
        self.assertEqual(
            self.http.get("/api/v1/projects/published").json()["projects"][0]["displayName"], "After"
        )
        self.assertTrue(self.tool("read_fragment", **{**args, "field": ""})["isError"])
        other = {**self.headers, "X-API-Key": "boris-test"}
        self.assertTrue(
            self.rpc("tools/call", {"name": "read_fragment", "arguments": args}, other)["isError"]
        )
        image = BytesIO()
        Image.new("RGB", (3, 4)).save(image, "PNG")
        asset = {"project": "demo", "filename": "cover.png"}
        upload = self.tool("upload_image", **asset, data_base64=base64.b64encode(image.getvalue()).decode())
        self.assertEqual(upload["decoded"]["reference"], "cover.png")
        asset_url = upload["decoded"]["url"]
        self.assertEqual(self.http.get(asset_url).content, image.getvalue())
        self.assertIn("cover.png", self.tool("list_images", project="demo")["decoded"]["images"])
        self.assertEqual(self.tool("preview_image", **asset)["content"][0]["type"], "image")
        self.assertTrue(self.tool("preview_image", **{**asset, "filename": "../game.json"})["isError"])
        self.assertFalse(self.tool("delete_image", **asset)["isError"])
        self.assertEqual(self.http.get(asset_url).status_code, 404)
        self.assertIn(
            "qualifiedDirection", self.tool("editor_help", group="link", topic="push")["decoded"]["result"]
        )

    def test_create_project(self):
        self.rpc(
            "initialize",
            {
                "protocolVersion": "2025-11-25",
                "capabilities": {},
                "clientInfo": {"name": "test", "version": "1"},
            },
        )
        made = self.tool("create_project", project="fresh", title="Fresh Game")
        self.assertEqual(made["decoded"], {"project": "fresh"})
        self.assertIn("fresh", self.tool("list_projects")["decoded"]["projects"])
        game = self.http.get("/api/v1/projects/fresh/game").json()
        self.assertEqual(game["general"]["name"], "Fresh Game")
        self.assertEqual(game["dialogs"], [])
        # Editable straight away through the normal patch flow.
        args = {"project": "fresh", "plane": "dialog", "field": "dialogs"}
        rev = self.tool("browse_field", **args)["decoded"]["revision"]
        add = {"op": "add", "path": "/-", "value": {"name": "main", "windows": []}}
        self.assertFalse(self.tool("patch_field", **args, revision=rev, operations=[add])["isError"])
        # startupDialog is seeded in the engine's DialogWindowId shape and stays strict.
        self.assertEqual(game["startupDialog"], {"kind": "window", "dialog": "", "window": ""})
        args = {"project": "fresh", "plane": "config", "field": "startupDialog"}
        rev = self.tool("browse_field", **args)["decoded"]["revision"]
        legacy = {"op": "replace", "path": "", "value": {"dialogName": "main", "windowUid": "start"}}
        self.assertTrue(self.tool("patch_field", **args, revision=rev, operations=[legacy])["isError"])
        good = {"op": "replace", "path": "", "value": {"kind": "window", "dialog": "main", "window": "start"}}
        self.assertFalse(self.tool("patch_field", **args, revision=rev, operations=[good])["isError"])
        # Existing, traversal and dotfile names are refused.
        for bad in ("fresh", "../x", "a/b", ".hidden", "  "):
            self.assertTrue(self.tool("create_project", project=bad)["isError"], bad)

    def test_dialog_authoring(self):
        game = {
            "dialogs": [
                {
                    "name": "intro",
                    "windows": [
                        {
                            "uid": "start",
                            "text": {"main": "Welcome", "list": []},
                            "tags": [],
                            "specialWidget": None,
                            "links": [],
                            "backgrounds": {"list": []},
                        }
                    ],
                }
            ],
            "translations": {"a/b": "Old"},
        }
        route = "/api/v1/projects/story/game"
        self.http.put(route, json=game).raise_for_status()
        field = {"project": "story", "plane": "dialog", "field": "dialogs"}
        loc = "/0/windows/0"
        read = self.tool("read_fragment", **field, path=loc + "/text/main")["decoded"]
        self.assertEqual(read["value"], "Welcome")
        reference = {
            "mainDirection": {"type": "reply", "replyText": "Good morning"},
            "alternativeDirections": [],
            "text": "Greet the shopkeeper",
        }
        changes = [
            {"op": "add", "path": loc + "/links/-", "value": reference},
            {"op": "add", "path": loc + "/entryScript", "value": "rt.props.visits += 1"},
        ]
        result = self.tool("patch_field", **field, operations=changes, revision=read["revision"])
        self.assertFalse(result["isError"], result["content"])
        window = self.http.get(route).json()["dialogs"][0]["windows"][0]
        self.assertEqual(window["links"], [reference])
        self.assertEqual(window["entryScript"], "rt.props.visits += 1")
        labels = {"project": "story", "plane": "config", "field": "translations"}
        read = self.tool("read_fragment", **labels, path="/a~1b")["decoded"]
        self.assertEqual(read["value"], "Old")
        result = self.tool(
            "patch_field",
            **labels,
            revision=read["revision"],
            operations=[
                {"op": "copy", "from": "/a~1b", "path": "/copy"},
                {"op": "move", "from": "/copy", "path": "/moved"},
                {"op": "remove", "path": "/a~1b"},
            ],
        )
        self.assertFalse(result["isError"], result["content"])
        self.assertEqual(self.http.get(route).json()["translations"], {"moved": "Old"})

    def test_official_client(self):
        async def run():
            async with (
                httpx.AsyncClient(headers={"Authorization": "Bearer alice-test"}, trust_env=False) as client,
                streamable_http_client(authorization.RESOURCE, http_client=client) as (reader, writer, _),
                ClientSession(reader, writer) as session,
            ):
                initialized = await session.initialize()
                self.assertEqual(initialized.serverInfo.name, "DiaLogicNgine Editor")
                catalog = await session.list_tools()
                self.assertEqual(
                    {tool.name for tool in catalog.tools},
                    {
                        "list_projects",
                        "create_project",
                        "editor_planes",
                        "browse_field",
                        "read_fragment",
                        "patch_field",
                        "editor_help",
                        "list_images",
                        "preview_image",
                        "upload_image",
                        "delete_image",
                    },
                )
                result = await session.call_tool("editor_planes", {})
                self.assertEqual(json.loads(result.content[0].text)["dialog"], ["dialogs"])

        asyncio.run(run())

    def test_oauth(self):
        metadata = self.http.get("/.well-known/oauth-authorization-server").json()
        callback = "https://example.org/callback"
        reg = self.http.post(metadata["registration_endpoint"], json={"redirect_uris": [callback]}).json()
        verifier = "a" * 64
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        params = {
            "response_type": "code",
            "client_id": reg["client_id"],
            "resource": authorization.RESOURCE,
            "redirect_uri": callback,
            "state": "abc",
            "code_challenge_method": "S256",
            "code_challenge": challenge,
        }
        consent = self.http.get(metadata["authorization_endpoint"], params=params).url
        self.assertIn(callback, self.http.get(consent).text)
        approved = self.http.post(
            consent, data={"decision": "allow", "key": "alice-test"}, follow_redirects=False
        )
        query = parse_qs(urlsplit(approved.headers["location"]).query)
        self.assertEqual(query["state"], ["abc"])
        form = {
            "client_id": reg["client_id"],
            "grant_type": "authorization_code",
            "code": query["code"][0],
            "code_verifier": verifier,
            "redirect_uri": callback,
        }
        endpoint = metadata["token_endpoint"]
        self.assertEqual(self.http.post(endpoint, data={**form, "code_verifier": "wrong"}).status_code, 400)
        grant = self.http.post(endpoint, data=form).json()
        self.assertEqual(self.http.post(endpoint, data=form).status_code, 400)
        refresh = self.http.post(
            endpoint,
            data={
                "client_id": reg["client_id"],
                "grant_type": "refresh_token",
                "refresh_token": grant["refresh_token"],
            },
        ).json()
        headers = {"Accept": self.headers["Accept"], "Authorization": "Bearer " + refresh["access_token"]}
        self.assertIn("tools", self.rpc("tools/list", {}, headers))
        with patch.dict(authorization.KEYS, alice="rotated"):
            self.assertEqual(self.http.post("/mcp", headers=headers, json={}).status_code, 401)
