"""Public OAuth clients, account consent, and MCP-only credentials."""

import base64
import hashlib
import hmac
import html
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import closing, contextmanager
from ipaddress import ip_address
from urllib.parse import urlsplit

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from mcp.server.auth.handlers.authorize import AuthorizationHandler
from mcp.server.auth.handlers.token import TokenHandler
from mcp.server.auth.middleware.client_auth import ClientAuthenticator
from mcp.server.auth.provider import (
    AuthorizationCode,
    AuthorizeError,
    RefreshToken,
    TokenError,
    construct_redirect_uri,
)
from mcp.server.transport_security import RequestBodyLimitMiddleware
from mcp.shared.auth import OAuthClientInformationFull, OAuthToken
from pydantic import BaseModel, Field, ValidationError, model_validator
from starlette.middleware.cors import CORSMiddleware

from app import auth

ORIGIN = os.getenv("MCP_PUBLIC_URL", "http://localhost:4267").rstrip("/")


def loopback(host):
    if host == "localhost":
        return True
    try:
        return ip_address((host or "").strip("[]")).is_loopback
    except ValueError:
        return False


public = urlsplit(ORIGIN)
if (
    not public.hostname
    or public.path
    or public.query
    or public.fragment
    or public.username
    or not (public.scheme == "https" or public.scheme == "http" and loopback(public.hostname))
):
    raise ValueError("MCP_PUBLIC_URL must be an HTTPS origin or a loopback HTTP origin")
RESOURCE = ORIGIN + "/mcp"
KEYS = json.loads(os.getenv("MCP_API_KEYS") or "{}")  # existing username -> dedicated secret
if not isinstance(KEYS, dict) or any(
    not isinstance(k, str) or not isinstance(v, str) or not v for k, v in KEYS.items()
):
    raise ValueError("MCP_API_KEYS must map usernames to nonempty keys")
if len(set(KEYS.values())) != len(KEYS):
    raise ValueError("Each MCP account requires a distinct key")

router = APIRouter(include_in_schema=False)
PRIVATE = {
    "Cache-Control": "no-store",
    # "no-referrer" makes Firefox send `Origin: null` on the form POST, which decide() rejects.
    # "same-origin" still never leaks the ticket URL cross-origin but keeps a real Origin header.
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
}


def play_resource() -> str:
    return ORIGIN + "/play-mcp"


def valid_resources() -> set[str]:
    return {RESOURCE, play_resource()}


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def key_owner(key):
    return next(
        (
            user
            for user, secret in KEYS.items()
            if hmac.compare_digest(secret.encode(), key.encode()) and auth.user_exists(user)
        ),
        None,
    )


@contextmanager
def database():
    with closing(sqlite3.connect(auth.AUTH_DIR / "mcp.sqlite")) as db, db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS grants (id TEXT PRIMARY KEY, kind TEXT, expiry INTEGER, payload TEXT)"
        )
        yield db


def read_grant(kind, token):
    with database() as db:
        row = db.execute(
            "SELECT payload FROM grants WHERE id=? AND kind=? AND expiry>?",
            (digest(token), kind, int(time.time())),
        ).fetchone()
        return json.loads(row[0]) if row else None


def consume(db, kind, token):
    row = db.execute(
        "DELETE FROM grants WHERE id=? AND kind=? AND expiry>? RETURNING payload",
        (digest(token), kind, int(time.time())),
    ).fetchone()
    return json.loads(row[0]) if row else None


def issue(db, kind, ttl, **payload):
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    payload["expires_at"] = now + ttl
    db.execute("DELETE FROM grants WHERE expiry<=?", (now,))
    db.execute("INSERT INTO grants VALUES (?,?,?,?)", (digest(token), kind, now + ttl, json.dumps(payload)))
    return token


def active(grant, expected_resource: str | None = None):
    if not grant:
        return False
    resource_ok = (
        grant["resource"] == expected_resource
        if expected_resource is not None
        else grant["resource"] in valid_resources()
    )
    if not resource_ok:
        return False
    user, fingerprint = grant["subject"], grant["fingerprint"]
    if fingerprint.startswith("account:"):
        return fingerprint == auth.account_grant_version(user)
    return user in KEYS and fingerprint == digest(KEYS[user]) and auth.user_exists(user)


def bearer_owner(token, resource: str | None = None):
    owner = key_owner(token)
    if owner:
        return owner
    grant = read_grant("access", token)
    return grant["subject"] if active(grant, expected_resource=resource or RESOURCE) else None


class Registration(BaseModel):
    client_name: str = Field(default="MCP client", max_length=100)
    redirect_uris: list[str] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def validate_callbacks(self):
        for uri in self.redirect_uris:
            url = urlsplit(uri)
            if (
                len(uri) > 512
                or "#" in uri
                or not url.scheme
                or url.username
                or url.password
                or url.scheme in {"javascript", "data", "file", "about", "blob", "filesystem", "vbscript"}
                or (url.scheme == "https" and not url.hostname)
                or (url.scheme == "http" and not loopback(url.hostname))
            ):
                raise ValueError("Invalid OAuth redirect URI")
        return self


class PublicClient(OAuthClientInformationFull):
    def validate_redirect_uri(self, redirect_uri):
        # Native loopback clients bind an ephemeral port (RFC 8252).
        if (
            redirect_uri
            and redirect_uri.scheme == "http"
            and loopback(redirect_uri.host)
            and not (redirect_uri.username or redirect_uri.password or redirect_uri.fragment)
        ):
            for registered in self.redirect_uris:
                if (registered.scheme, registered.host, registered.path, registered.query) == (
                    "http",
                    redirect_uri.host,
                    redirect_uri.path,
                    redirect_uri.query,
                ):
                    return redirect_uri
        return super().validate_redirect_uri(redirect_uri)


class Provider:
    async def get_client(self, client_id):
        if len(client_id) > 8192:
            return None
        try:
            reg = Registration.model_validate_json(base64.urlsafe_b64decode(client_id))
            return PublicClient(
                **reg.model_dump(),
                client_id=client_id,
                token_endpoint_auth_method="none",
                scope="mcp",
                grant_types=["authorization_code", "refresh_token"],
            )
        except (ValueError, ValidationError):
            return None

    async def authorize(self, client, params):
        if (params.resource is not None and params.resource not in valid_resources()) or not re.fullmatch(
            r"[A-Za-z0-9_-]{43}", params.code_challenge
        ):
            raise AuthorizeError("invalid_request", "Invalid resource or S256 challenge")
        with database() as db:
            ticket = issue(db, "consent", 300, client_id=client.client_id, **params.model_dump(mode="json"))
        return f"{ORIGIN}/oauth/consent/{ticket}"

    async def load_authorization_code(self, client, authorization_code):
        grant = read_grant("code", authorization_code)
        if active(grant):
            return AuthorizationCode(code=authorization_code, **grant)

    async def load_refresh_token(self, client, refresh_token):
        grant = read_grant("refresh", refresh_token)
        if active(grant):
            return RefreshToken(token=refresh_token, **grant)

    def exchange(self, kind, token):
        with database() as db:
            grant = consume(db, kind, token)
            if not active(grant):
                raise TokenError("invalid_grant", "Grant expired or already redeemed")
            fields = {k: grant[k] for k in ("subject", "fingerprint", "client_id", "scopes", "resource")}
            return OAuthToken(
                access_token=issue(db, "access", 3600, **fields),
                token_type="Bearer",
                expires_in=3600,
                refresh_token=issue(db, "refresh", 30 * 86400, **fields),
                scope="mcp",
            )

    async def exchange_authorization_code(self, client, authorization_code):
        return self.exchange("code", authorization_code.code)

    async def exchange_refresh_token(self, client, refresh_token, scopes):
        return self.exchange("refresh", refresh_token.token)


provider = Provider()


@router.get("/.well-known/oauth-protected-resource")
@router.get("/.well-known/oauth-protected-resource/mcp")
async def resource_metadata():
    return {
        "resource": RESOURCE,
        "authorization_servers": [ORIGIN],
        "scopes_supported": ["mcp"],
        "bearer_methods_supported": ["header"],
    }


@router.get("/.well-known/oauth-protected-resource/play-mcp")
async def play_resource_metadata():
    return {
        "resource": play_resource(),
        "authorization_servers": [ORIGIN],
        "scopes_supported": ["mcp"],
        "bearer_methods_supported": ["header"],
    }


@router.get("/.well-known/oauth-authorization-server")
async def server_metadata():
    return {
        "issuer": ORIGIN,
        "authorization_endpoint": ORIGIN + "/oauth/authorize",
        "registration_endpoint": ORIGIN + "/oauth/register",
        "token_endpoint": ORIGIN + "/oauth/token",
        "scopes_supported": ["mcp"],
        "token_endpoint_auth_methods_supported": ["none"],
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
    }


@router.post("/oauth/register", status_code=201)
async def register(reg: Registration):
    client_id = base64.urlsafe_b64encode(reg.model_dump_json().encode()).decode()
    client = await provider.get_client(client_id)
    if not client:
        raise HTTPException(400, "Invalid client metadata")
    return client.model_dump(exclude_none=True)


@router.get("/oauth/authorize")
async def authorize(request: Request):
    if request.query_params.get("code_challenge_method") != "S256":
        return JSONResponse({"error": "invalid_request", "error_description": "S256 PKCE required"}, 400)
    return await AuthorizationHandler(provider).handle(request)


@router.get("/oauth/consent/{ticket}")
async def consent(ticket: str, request: Request):
    pending = read_grant("consent", ticket)
    if not pending:
        raise HTTPException(400, "Approval expired")
    client = await provider.get_client(pending["client_id"])
    user = auth.get_optional_user(request)
    if user and auth.user_exists(user):
        identity = f'<p>Signed in as <strong>{html.escape(user)}</strong>.</p><input type="hidden" name="account" value="{html.escape(user)}">'
    else:
        identity = """<p>Sign in with your DiaLogicNgine account.</p>
        <p><label>Username <input name="username" autocomplete="username" required></label></p>
        <p><label>Password <input type="password" name="password" autocomplete="current-password" required></label></p>"""
    is_player = pending.get("resource") == play_resource()
    title = "Connect to DiaLogicNgine Player" if is_player else "Connect to DiaLogicNgine Editor"
    heading = (
        f"Allow {html.escape(client.client_name)} to play games and manage your saves?"
        if is_player
        else f"Allow {html.escape(client.client_name)} to edit your games?"
    )
    description = (
        "This grants access to play published games and your own games, and to manage your saved play sessions."
        if is_player
        else "This grants access to read and change your saved projects and their images."
    )
    return HTMLResponse(
        f"""<!doctype html><html lang="en"><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{title}</title><main>
        <h1>{heading}</h1>
        <p>{description}</p>
        <p>Return address: <code>{html.escape(pending["redirect_uri"])}</code></p>
        <form method="post">{identity}
        <button name="decision" value="allow">Allow access</button>
        <button name="decision" value="deny" formnovalidate>Deny</button></form></main></html>""",
        headers=PRIVATE,
    )


@router.post("/oauth/consent/{ticket}")
def decide(ticket: str, request: Request, decision: str = Form(), key: str = Form(""),
           account: str = Form(""), username: str = Form(""), password: str = Form("")):
    origin = request.headers.get("origin")
    if origin not in {None, ORIGIN} or decision not in {"allow", "deny"}:
        raise HTTPException(400, "Invalid consent request")
    user = fingerprint = None
    if decision == "allow":
        if key:
            user = key_owner(key)
            fingerprint = digest(key)
        elif account:
            if origin != ORIGIN or account != auth.get_optional_user(request):
                raise HTTPException(403, "Sign-in session changed. Reopen the approval page.")
            user = account
            fingerprint = auth.account_grant_version(user)
        elif username and password:
            username = auth.validate_username(username)
            if auth.authenticate(username, password):
                user = username
                fingerprint = auth.account_grant_version(user)
        if not user or not fingerprint:
            raise HTTPException(401, "Sign-in failed. Go back and check your credentials.")
    with database() as db:
        pending = consume(db, "consent", ticket)
        if not pending:
            raise HTTPException(400, "Approval expired")
        target_resource = pending.get("resource") or RESOURCE
        if target_resource not in valid_resources():
            raise HTTPException(400, "Invalid resource")
        state = pending.pop("state")
        pending.pop("expires_at")
        pending.update(scopes=["mcp"], resource=target_resource)
        result = (
            {"code": issue(db, "code", 120, subject=user, fingerprint=fingerprint, **pending)}
            if user
            else {"error": "access_denied"}
        )
    return RedirectResponse(
        construct_redirect_uri(pending["redirect_uri"], state=state, **result),
        303,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
    )


@router.post("/oauth/token")
async def token(request: Request):
    form = await request.form()
    requested_resource = form.get("resource")
    if requested_resource is not None and requested_resource not in valid_resources():
        return JSONResponse({"error": "invalid_target"}, 400)
    return await TokenHandler(provider, ClientAuthenticator(provider)).handle(request)


class OAuthHTTPMiddleware:
    """Size limits for OAuth forms and browser discovery for public clients."""

    def __init__(self, app):
        self.app = app
        self.oauth = RequestBodyLimitMiddleware(app, 64 * 1024)
        self.public = CORSMiddleware(
            self.oauth,
            allow_origins=["*"],
            allow_methods=["GET", "POST"],
            allow_headers=["MCP-Protocol-Version"],
        )

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        if path.startswith("/.well-known/oauth-") or path in {"/oauth/token", "/oauth/register"}:
            handler = self.public
        elif path.startswith("/oauth/"):
            handler = self.oauth
        else:
            handler = self.app
        await handler(scope, receive, send)
