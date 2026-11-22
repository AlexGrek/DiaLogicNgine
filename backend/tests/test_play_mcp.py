"""End-to-end integration tests for Player MCP (/play-mcp) with real isolated Deno workers."""

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
from app.play_mcp import pool as play_pool
from app.play_mcp import store as play_store
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from PIL import Image


def _png_bytes(color=(120, 40, 200), size=(64, 48)) -> bytes:
    buf = BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return buf.getvalue()


def _rich_adventure_game() -> dict:
    return {
        "engineVersion": "0.21",
        "general": {
            "name": "Reactor Quest",
            "version": "1.2",
            "description": "A test visual novel with locations, NPCs, items, quests, and PAC.",
            "authors": ["Alice"],
            "extras": {},
        },
        "startupDialog": {"kind": "window", "dialog": "intro", "window": "start"},
        "props": [
            {"name": "energy", "datatype": "number", "defaultValue": 80, "variants": []},
            {"name": "switched", "datatype": "boolean", "defaultValue": False, "variants": []},
            {"name": "used_key", "datatype": "boolean", "defaultValue": False, "variants": []},
        ],
        "facts": [
            {
                "uid": "clue",
                "short": "Reactor blueprint",
                "full": "Flip the main switch before opening the reactor core.",
                "discussable": True,
            }
        ],
        "items": [
            {
                "uid": "key",
                "name": "Brass Key",
                "description": "Opens maintenance panels.",
                "image": "key.png",
                "thumbnail": "key.png",
                "stackable": True,
                "tags": ["tool"],
                "stats": {"weight": 1},
            }
        ],
        "objectives": [
            {
                "uid": "main",
                "name": "Main Story",
                "quests": [
                    {
                        "uid": "stabilize",
                        "name": "Stabilize Reactor",
                        "path": ["main", "stabilize"], "tags": [],
                        "ordered": False,
                        "tasks": [
                            {
                                "uid": "flip_switch",
                                "text": "Flip the reactor switch",
                                "critical": False,
                                "path": ["main", "stabilize", "flip_switch"],
                            }
                        ],
                    }
                ],
            }
        ],
        "uiElements": {
            "meters": [
                {
                    "uid": "energy",
                    "name": "Energy",
                    "value": "return rt.props.energy",
                    "layout": {"opacity": 1},
                    "progressBar": {"min": 0, "max": 100, "colors": True, "yellowLevel": 30, "redLevel": 10},
                }
            ]
        },
        "chars": [
            {
                "uid": "guide",
                "displayName": {"main": "Dr. Nova", "list": []},
                "description": {"main": "Lead engineer.", "list": []},
                "avatar": {"main": "avatar.png", "list": []},
                "props": [],
                "roles": [],
                "overrideProps": [],
                "discussable": True,
                "dialog": {
                    "text": {"main": "Ask me anything about the facility.", "list": []},
                    "background": {"main": "scene.png", "list": []},
                    "links": [
                        {
                            "text": "Inspect reactor panel",
                            "mainDirection": {
                                "type": "jump",
                                "qualifiedDirection": {"kind": "window", "dialog": "intro", "window": "pac_host"},
                            },
                            "alternativeDirections": [],
                        }
                    ],
                    "behavior": {
                        "reactions": [
                            {
                                "trigger": {"facts": ["clue"], "chars": [], "items": [], "places": []},
                                "reply": "Good eye — flip the switch first, then touch the core!",
                            }
                        ]
                    },
                },
            }
        ],
        "roles": [],
        "locs": [
            {
                "uid": "square",
                "displayName": "Courtyard",
                "text": {"main": "Rain falls on the courtyard.", "list": []},
                "backgrounds": {"main": "scene.png", "list": []},
                "thumbnail": "scene.png",
                "routes": ["lab"],
                "links": [],
                "eventHosts": [],
                "discussable": True,
            },
            {
                "uid": "lab",
                "displayName": "Control Lab",
                "text": {"main": "Consoles hum softly.", "list": []},
                "backgrounds": {"main": "scene.png", "list": []},
                "thumbnail": "scene.png",
                "routes": ["square"],
                "links": [
                    {
                        "text": "Talk to Dr. Nova",
                        "mainDirection": {"type": "toperson", "direction": "guide"},
                        "alternativeDirections": [],
                    }
                ],
                "eventHosts": [],
                "discussable": True,
            },
        ],
        "pacWidgets": [
            {
                "id": "reactor_pac",
                "background": "pac_bg.png",
                "eventHosts": [],
                "zones": [
                    {
                        "id": "switch",
                        "name": "Main Switch",
                        "x": 10,
                        "y": 20,
                        "width": 20,
                        "height": 25,
                        "onClickScript": "rt.props.switched = true; rt.objectives.main.stabilize.flip_switch.complete();",
                    },
                    {
                        "id": "core",
                        "name": "Reactor Core",
                        "x": 55,
                        "y": 25,
                        "width": 25,
                        "height": 35,
                        "isDisabledIfScript": "return !rt.props.switched",
                        "mainDirection": {
                            "type": "jump",
                            "qualifiedDirection": {"kind": "window", "dialog": "intro", "window": "ending"},
                        },
                        "alternativeDirections": [],
                    },
                ],
            }
        ],
        "dialogs": [
            {
                "name": "intro",
                "windows": [
                    {
                        "uid": "start",
                        "actor": {"character": "guide"},
                        "text": {
                            "main": "Welcome to the reactor.\n---\nCheck your gear before heading outside.",
                            "list": [],
                        },
                        "backgrounds": {"main": "scene.png", "list": []},
                        "tags": [],
                        "specialWidget": None,
                        "entryScript": (
                            "if (context && context.usedItem === 'key') { rt.props.used_key = true; rt.props.energy += 15; }"
                            "else if (!rt.history.dialogVisited('intro', 'start')) {"
                            "  rt.items.add('key', 1); rt.facts.clue.know(); rt.objectives.main.stabilize.flip_switch.open();"
                            "}"
                        ),
                        "links": [
                            {
                                "text": "Go to courtyard",
                                "mainDirection": {"type": "tolocation", "direction": "square"},
                                "alternativeDirections": [],
                            },
                            {
                                "text": "Locked door",
                                "isEnabled": "return false",
                                "mainDirection": {"type": "reply", "replyText": "Nope"},
                                "alternativeDirections": [],
                            },
                        ],
                    },
                    {
                        "uid": "pac_host",
                        "text": {"main": "", "list": []},
                        "backgrounds": {"list": []},
                        "tags": [],
                        "specialWidget": "pac::reactor_pac",
                        "links": [],
                    },
                    {
                        "uid": "ending",
                        "text": {"main": "Reactor stabilized! Victory.", "list": []},
                        "backgrounds": {"main": "scene.png", "list": []},
                        "tags": [],
                        "specialWidget": None,
                        "links": [],
                    },
                ],
            }
        ],
        "events": [],
        "eventHosts": [],
        "situations": [],
        "functions": [],
        "hooks": [],
    }


def _simple_branch_game(name: str) -> dict:
    return {
        "engineVersion": "0.21",
        "general": {"name": name, "version": "1.0", "description": f"Story: {name}", "authors": ["Tester"], "extras": {}},
        "startupDialog": {"kind": "window", "dialog": "main", "window": "w1"},
        "dialogs": [
            {
                "name": "main",
                "windows": [
                    {
                        "uid": "w1",
                        "text": {"main": "Step one", "list": []},
                        "backgrounds": {"list": []},
                        "tags": [],
                        "specialWidget": None,
                        "links": [
                            {"text": "Next", "mainDirection": {"type": "local", "direction": "w2"}, "alternativeDirections": []}
                        ],
                    },
                    {
                        "uid": "w2",
                        "text": {"main": "Step two", "list": []},
                        "backgrounds": {"list": []},
                        "tags": [],
                        "specialWidget": None,
                        "links": [
                            {"text": "Finish", "mainDirection": {"type": "local", "direction": "w3"}, "alternativeDirections": []}
                        ],
                    },
                    {
                        "uid": "w3",
                        "text": {"main": "Step three", "list": []},
                        "backgrounds": {"list": []},
                        "tags": [],
                        "specialWidget": None,
                        "links": [],
                    },
                ],
            }
        ],
    }


class PlayerMcpTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        stack = ExitStack()
        cls.addClassCleanup(stack.close)
        storage = Path(stack.enter_context(TemporaryDirectory()))
        for module, attrs in [
            (projects, {"STORAGE_ROOT": storage}),
            (image_storage, {"STORAGE_ROOT": storage}),
            (play_store, {"STORAGE_ROOT": storage}),
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
            (authorization, {"KEYS": {"alice": "alice-key", "boris": "boris-key"}}),
        ]:
            stack.enter_context(patch.multiple(module, **attrs))

        listener = stack.enter_context(socket.socket())
        listener.bind(("127.0.0.1", 0))
        origin = f"http://127.0.0.1:{listener.getsockname()[1]}"
        cls.origin = origin
        stack.enter_context(patch.multiple(authorization, ORIGIN=origin, RESOURCE=origin + "/mcp"))

        from app.game_mcp import server as editor_server
        from app.play_mcp import server as play_server
        from app.main import app

        netloc = urlsplit(origin).netloc
        for sec in (
            editor_server.security,
            editor_server.mcp.settings.transport_security,
            play_server.security,
            play_server.mcp.settings.transport_security,
        ):
            stack.enter_context(patch.object(sec, "allowed_hosts", [netloc]))
            stack.enter_context(patch.object(sec, "allowed_origins", [origin]))

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

        cls.alice_http = stack.enter_context(httpx.Client(base_url=origin, follow_redirects=True, trust_env=False))
        cls.boris_http = stack.enter_context(httpx.Client(base_url=origin, follow_redirects=True, trust_env=False))
        cls.alice_http.post("/api/v1/auth/register", json={"username": "alice", "password": "testing"}).raise_for_status()
        cls.boris_http.post("/api/v1/auth/register", json={"username": "boris", "password": "testing"}).raise_for_status()
        cls.alice_headers = {"Accept": "application/json, text/event-stream", "X-API-Key": "alice-key"}
        cls.boris_headers = {"Accept": "application/json, text/event-stream", "X-API-Key": "boris-key"}

    def rpc(self, method, params, headers=None, endpoint="/play-mcp"):
        response = self.alice_http.post(
            endpoint,
            headers=headers or self.alice_headers,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        )
        response.raise_for_status()
        return response.json()["result"]

    def tool(self, _tool_name, headers=None, **args):
        result = self.rpc("tools/call", {"name": _tool_name, "arguments": args}, headers=headers)
        blocks = result["content"]
        if not result.get("isError") and blocks and blocks[0]["type"] == "text":
            result["decoded"] = json.loads(blocks[0]["text"])
        return result

    def _upload_image(self, client: httpx.Client, project: str, filename: str, color=(100, 140, 200)):
        client.put(
            f"/api/v1/projects/{project}/images/{filename}",
            files={"file": (filename, _png_bytes(color), "image/png")},
        ).raise_for_status()

    def test_official_client_and_oauth_isolation(self):
        # Unauthenticated request returns 401 with /play-mcp resource metadata
        unauth = self.alice_http.post("/play-mcp", json={})
        self.assertEqual(unauth.status_code, 401)
        self.assertIn("/.well-known/oauth-protected-resource/play-mcp", unauth.headers["www-authenticate"])

        res_meta = self.alice_http.get("/.well-known/oauth-protected-resource/play-mcp").json()
        self.assertEqual(res_meta["resource"], self.origin + "/play-mcp")

        # Complete OAuth S256 flow scoped specifically to /play-mcp
        auth_meta = self.alice_http.get("/.well-known/oauth-authorization-server").json()
        callback = "https://example.org/play-callback"
        reg = self.alice_http.post(auth_meta["registration_endpoint"], json={"redirect_uris": [callback]}).json()
        verifier = "p" * 64
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        consent_url = self.alice_http.get(
            auth_meta["authorization_endpoint"],
            params={
                "response_type": "code",
                "client_id": reg["client_id"],
                "resource": self.origin + "/play-mcp",
                "redirect_uri": callback,
                "state": "xyz",
                "code_challenge_method": "S256",
                "code_challenge": challenge,
            },
        ).url
        consent_html = self.alice_http.get(consent_url).text
        self.assertIn("play games and manage your saves", consent_html)
        approved = self.alice_http.post(
            consent_url, data={"decision": "allow", "key": "alice-key"}, follow_redirects=False
        )
        code = parse_qs(urlsplit(approved.headers["location"]).query)["code"][0]
        grant = self.alice_http.post(
            auth_meta["token_endpoint"],
            data={
                "client_id": reg["client_id"],
                "grant_type": "authorization_code",
                "code": code,
                "code_verifier": verifier,
                "redirect_uri": callback,
                "resource": self.origin + "/play-mcp",
            },
        ).json()
        play_bearer = {"Accept": "application/json, text/event-stream", "Authorization": "Bearer " + grant["access_token"]}

        # Play token works on /play-mcp...
        self.assertIn("tools", self.rpc("tools/list", {}, headers=play_bearer, endpoint="/play-mcp"))
        # ...and is rejected on /mcp (resource isolation)
        self.assertEqual(
            self.alice_http.post("/mcp", headers=play_bearer, json={"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}).status_code,
            401,
        )

        # Official Python MCP ClientSession over streamable_http_client
        async def run_client():
            async with (
                httpx.AsyncClient(headers={"Authorization": "Bearer " + grant["access_token"]}, trust_env=False) as client,
                streamable_http_client(self.origin + "/play-mcp", http_client=client) as (reader, writer, _),
                ClientSession(reader, writer) as session,
            ):
                init = await session.initialize()
                self.assertEqual(init.serverInfo.name, "DiaLogicNgine Player")
                catalog = await session.list_tools()
                names = {t.name for t in catalog.tools}
                self.assertEqual(
                    names,
                    {
                        "list_available_games",
                        "list_saved_games",
                        "list_recently_played",
                        "start_game",
                        "list_sessions",
                        "resume_session",
                        "delete_session",
                        "save_checkpoint",
                        "list_checkpoints",
                        "load_checkpoint",
                        "delete_checkpoint",
                        "get_state",
                        "act",
                        "inspect",
                        "view_image",
                    },
                )

        asyncio.run(run_client())

    def test_full_gameplay_and_images(self):
        project = "reactor_adventure"
        self.alice_http.put(f"/api/v1/projects/{project}/game", json=_rich_adventure_game()).raise_for_status()
        self.alice_http.post(f"/api/v1/projects/{project}/publish", json={"published": True}).raise_for_status()
        self._upload_image(self.alice_http, project, "scene.png", (40, 80, 140))
        self._upload_image(self.alice_http, project, "avatar.png", (200, 120, 40))
        self._upload_image(self.alice_http, project, "key.png", (220, 190, 50))
        self._upload_image(self.alice_http, project, "pac_bg.png", (30, 50, 70))

        # Boris plays Alice's published game
        started = self.tool("start_game", headers=self.boris_headers, project=project, title="Boris Run")
        self.assertFalse(started.get("isError"), started)
        self.assertEqual(len(started["content"]), 2)
        self.assertEqual(started["content"][1]["type"], "image")

        turn = started["decoded"]
        code = turn["session_code"]
        self.assertTrue(code.startswith("play_"))
        self.assertEqual(turn["widget"], "dialog")
        self.assertEqual(turn["scene"]["text"], "Welcome to the reactor.")
        self.assertEqual(turn["scene"]["page_index"], 0)
        self.assertEqual(turn["scene"]["page_count"], 2)
        self.assertTrue(turn["actions"]["can_continue"])
        self.assertEqual(turn["actions"]["continue_mode"], "next_page")
        self.assertEqual(turn["hud"][0]["value"], 80)
        self.assertGreaterEqual(len(turn["new_notifications"]), 1)

        # Cannot choose link before paging through text
        self.assertTrue(self.tool("act", headers=self.boris_headers, session_code=code, action="choose_link", index=0)["isError"])

        # Advance to page 2
        p2 = self.tool("act", headers=self.boris_headers, session_code=code, action="continue", include_image=False)
        self.assertFalse(p2.get("isError"), p2)
        self.assertEqual(len(p2["content"]), 1)  # include_image=False
        self.assertEqual(p2["decoded"]["scene"]["page_index"], 1)
        self.assertEqual(p2["decoded"]["step"], 0)  # paging does not bump step
        self.assertEqual(len(p2["decoded"]["actions"]["links"]), 2)
        self.assertTrue(p2["decoded"]["actions"]["links"][1]["disabled"])

        # Disabled link is rejected
        self.assertTrue(self.tool("act", headers=self.boris_headers, session_code=code, action="choose_link", index=1)["isError"])

        # Use inventory item in dialog -> entryScript adds +15 energy
        used = self.tool("act", headers=self.boris_headers, session_code=code, action="use_item", target_id="key", include_image=False)
        self.assertFalse(used.get("isError"), used)
        self.assertEqual(used["decoded"]["hud"][0]["value"], 95)

        # Inspect inventory, facts, objectives
        inv = self.tool("inspect", headers=self.boris_headers, session_code=code, section="inventory")["decoded"]
        self.assertEqual(inv["data"][0]["uid"], "key")
        facts = self.tool("inspect", headers=self.boris_headers, session_code=code, section="facts")["decoded"]
        self.assertEqual(facts["data"][0]["uid"], "clue")
        obj = self.tool("inspect", headers=self.boris_headers, session_code=code, section="objectives")["decoded"]
        self.assertEqual(obj["data"]["questsOpen"][0]["name"], "Stabilize Reactor")

        # Fetch avatar and item images via view_image
        av_img = self.tool("view_image", headers=self.boris_headers, session_code=code, target="avatar")
        self.assertEqual(av_img["content"][0]["type"], "image")
        item_img = self.tool("view_image", headers=self.boris_headers, session_code=code, target="item", target_id="key")
        self.assertEqual(item_img["content"][0]["type"], "image")

        # Follow link to Courtyard location
        loc_turn = self.tool("act", headers=self.boris_headers, session_code=code, action="choose_link", index=0, include_image=False)["decoded"]
        self.assertEqual(loc_turn["widget"], "location")
        self.assertEqual(loc_turn["scene"]["location"]["uid"], "square")
        self.assertEqual(loc_turn["actions"]["routes"][0]["uid"], "lab")

        # Travel to Control Lab
        lab_turn = self.tool("act", headers=self.boris_headers, session_code=code, action="travel", target_id="lab", include_image=False)["decoded"]
        self.assertEqual(lab_turn["widget"], "location")
        self.assertEqual(lab_turn["scene"]["location"]["uid"], "lab")

        # Talk to Dr. Nova
        char_turn = self.tool("act", headers=self.boris_headers, session_code=code, action="choose_link", index=0, include_image=False)["decoded"]
        self.assertEqual(char_turn["widget"], "char")
        self.assertEqual(char_turn["scene"]["speaker"]["name"], "Dr. Nova")
        self.assertEqual(char_turn["actions"]["discuss_topics"]["facts"][0]["uid"], "clue")

        # Discuss known fact 'clue'
        reply_turn = self.tool(
            "act",
            headers=self.boris_headers,
            session_code=code,
            action="discuss",
            topic_type="fact",
            target_id="clue",
            include_image=False,
        )["decoded"]
        self.assertIn("flip the switch first", reply_turn["scene"]["text"])

        # Open Point-and-Click scene (receives annotated PAC PNG)
        pac_res = self.tool("act", headers=self.boris_headers, session_code=code, action="choose_link", index=0, include_image=True)
        self.assertFalse(pac_res.get("isError"), pac_res)
        self.assertEqual(pac_res["content"][1]["type"], "image")
        img_raw = base64.b64decode(pac_res["content"][1]["data"])
        with Image.open(BytesIO(img_raw)) as rendered_pac:
            self.assertEqual(rendered_pac.size, (960, 540))

        pac_turn = pac_res["decoded"]
        self.assertEqual(pac_turn["widget"], "pac")
        zones = {z["id"]: z for z in pac_turn["actions"]["zones"]}
        self.assertFalse(zones["switch"]["disabled"])
        self.assertTrue(zones["core"]["disabled"])

        # Clicking disabled core fails
        self.assertTrue(self.tool("act", headers=self.boris_headers, session_code=code, action="click_zone", target_id="core")["isError"])

        # Click switch (in-place action enables core and completes task)
        after_switch = self.tool(
            "act", headers=self.boris_headers, session_code=code, action="click_zone", target_id="switch", include_image=False
        )["decoded"]
        self.assertEqual(after_switch["widget"], "pac")
        zones2 = {z["id"]: z for z in after_switch["actions"]["zones"]}
        self.assertFalse(zones2["core"]["disabled"])

        # Click core -> navigates to ending
        ending = self.tool(
            "act", headers=self.boris_headers, session_code=code, action="click_zone", target_id="core", include_image=False
        )["decoded"]
        self.assertEqual(ending["widget"], "dialog")
        self.assertIn("Victory", ending["scene"]["text"])

    def test_save_load_eviction_library_and_cross_user_isolation(self):
        self.alice_http.put("/api/v1/projects/pub_tale/game", json=_simple_branch_game("Public Tale")).raise_for_status()
        self.alice_http.post("/api/v1/projects/pub_tale/publish", json={"published": True}).raise_for_status()
        self.alice_http.put("/api/v1/projects/secret_tale/game", json=_simple_branch_game("Secret Tale")).raise_for_status()
        self.boris_http.put("/api/v1/projects/boris_only/game", json=_simple_branch_game("Boris Only")).raise_for_status()

        # Available games visibility: published + own unpublished
        alice_avail = {g["project"] for g in self.tool("list_available_games")["decoded"]["games"]}
        boris_avail = {g["project"] for g in self.tool("list_available_games", headers=self.boris_headers)["decoded"]["games"]}
        self.assertIn("pub_tale", alice_avail)
        self.assertIn("secret_tale", alice_avail)
        self.assertNotIn("boris_only", alice_avail)
        self.assertIn("pub_tale", boris_avail)
        self.assertIn("boris_only", boris_avail)
        self.assertNotIn("secret_tale", boris_avail)

        # Boris cannot start Alice's unpublished game
        self.assertTrue(self.tool("start_game", headers=self.boris_headers, project="secret_tale")["isError"])

        # Alice starts a session on secret_tale, advances to step 1, saves checkpoint, advances to step 2
        s1 = self.tool("start_game", project="secret_tale", title="Run A", include_image=False)["decoded"]
        code = s1["session_code"]
        self.assertEqual(s1["scene"]["text"], "Step one")

        t1 = self.tool("act", session_code=code, action="choose_link", index=0, include_image=False)["decoded"]
        self.assertEqual(t1["scene"]["text"], "Step two")
        cp = self.tool("save_checkpoint", session_code=code, name="at_step_two")
        self.assertFalse(cp.get("isError"), cp)

        t2 = self.tool("act", session_code=code, action="choose_link", index=0, include_image=False)["decoded"]
        self.assertEqual(t2["scene"]["text"], "Step three")

        # Cross-user session_code isolation: Boris cannot read, act, resume, inspect, or delete Alice's session
        for tool_name, kwargs in [
            ("get_state", {"session_code": code}),
            ("resume_session", {"session_code": code}),
            ("act", {"session_code": code, "action": "continue"}),
            ("inspect", {"session_code": code, "section": "summary"}),
            ("delete_session", {"session_code": code}),
        ]:
            self.assertTrue(self.tool(tool_name, headers=self.boris_headers, **kwargs)["isError"], tool_name)

        # Discovery tools show saved games, recently played, and sessions
        saved_games = self.tool("list_saved_games")["decoded"]["games"]
        self.assertTrue(any(g["project"] == "secret_tale" and g["latest_session_code"] == code for g in saved_games))
        recent = self.tool("list_recently_played", limit=5)["decoded"]["sessions"]
        self.assertEqual(recent[0]["session_code"], code)
        avail_after = {g["project"]: g for g in self.tool("list_available_games")["decoded"]["games"]}
        self.assertTrue(avail_after["secret_tale"]["has_saves"])
        self.assertGreaterEqual(avail_after["secret_tale"]["save_count"], 1)

        # Simulate idle worker eviction by aging last_used past TTL, then verify transparent DB resume
        old_worker = play_pool.pool._workers[("alice", code)]
        old_pid = old_worker.proc.pid
        old_worker.last_used = 0.0
        resumed = self.tool("resume_session", session_code=code, include_image=False)["decoded"]
        self.assertEqual(resumed["scene"]["text"], "Step three")
        new_worker = play_pool.pool._workers[("alice", code)]
        self.assertIsNot(new_worker, old_worker)
        self.assertNotEqual(new_worker.proc.pid, old_pid)
        sessions = self.tool("list_sessions", project="secret_tale")["decoded"]["sessions"]
        target = next(s for s in sessions if s["session_code"] == code)
        self.assertTrue(target["worker_active"])
        self.assertEqual(target["checkpoint_count"], 1)

        # Undo 1 step via previous autosave -> back to Step two
        undone = self.tool("load_checkpoint", session_code=code, use_previous_autosave=True, include_image=False)["decoded"]
        self.assertEqual(undone["scene"]["text"], "Step two")

        # Advance again, then restore named checkpoint
        self.tool("act", session_code=code, action="choose_link", index=0, include_image=False)
        cps = self.tool("list_checkpoints", session_code=code)["decoded"]
        self.assertEqual([c["name"] for c in cps["checkpoints"]], ["at_step_two"])
        loaded = self.tool("load_checkpoint", session_code=code, name="at_step_two", include_image=False)["decoded"]
        self.assertEqual(loaded["scene"]["text"], "Step two")

        # Delete checkpoint and session
        self.assertFalse(self.tool("delete_checkpoint", session_code=code, name="at_step_two").get("isError"))
        self.assertFalse(self.tool("delete_session", session_code=code).get("isError"))
        self.assertTrue(self.tool("get_state", session_code=code)["isError"])

    def test_deno_sandbox_and_timeout_recovery(self):
        # Script attempts to access Deno APIs (fs) and also has an infinite-loop branch
        hostile_game = {
            "engineVersion": "0.21",
            "general": {"name": "Sandbox Test", "version": "1.0", "description": "", "authors": [], "extras": {}},
            "startupDialog": {"kind": "window", "dialog": "d", "window": "w1"},
            "props": [{"name": "probe", "datatype": "string", "defaultValue": "", "variants": []}],
            "dialogs": [
                {
                    "name": "d",
                    "windows": [
                        {
                            "uid": "w1",
                            "text": {"main": "Safe room", "list": []},
                            "backgrounds": {"list": []},
                            "tags": [],
                            "specialWidget": None,
                            "entryScript": "rt.props.probe = typeof Deno;",
                            "links": [
                                {
                                    "text": "Infinite loop",
                                    "actionCode": "while (true) {}",
                                    "mainDirection": {"type": "local", "direction": "w2"},
                                    "alternativeDirections": [],
                                },
                                {
                                    "text": "Safe exit",
                                    "mainDirection": {"type": "local", "direction": "w2"},
                                    "alternativeDirections": [],
                                },
                            ],
                        },
                        {
                            "uid": "w2",
                            "text": {"main": "Escaped safely", "list": []},
                            "backgrounds": {"list": []},
                            "tags": [],
                            "specialWidget": None,
                            "links": [],
                        },
                    ],
                }
            ],
        }
        self.alice_http.put("/api/v1/projects/sandbox_test/game", json=hostile_game).raise_for_status()

        started = self.tool("start_game", project="sandbox_test", include_image=False)["decoded"]
        code = started["session_code"]
        # Verify globalThis.Deno was stripped inside the worker
        saved = play_store.require_session("alice", code)
        self.assertEqual(json.loads(saved["state_json"])["props"]["probe"], "undefined")

        # Trigger infinite loop with short timeout -> cleanly errors and kills hung worker
        with patch.object(play_pool, "TURN_TIMEOUT_SECONDS", 0.6):
            hung = self.tool("act", session_code=code, action="choose_link", index=0, include_image=False)
        self.assertTrue(hung["isError"])
        self.assertIn("timed out", hung["content"][0]["text"].lower())

        # Saved state is intact; agent can immediately resume and take the safe link
        recovered = self.tool("act", session_code=code, action="choose_link", index=1, include_image=False)
        self.assertFalse(recovered.get("isError"), recovered)
        self.assertEqual(recovered["decoded"]["scene"]["text"], "Escaped safely")
