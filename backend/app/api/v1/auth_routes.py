"""
Authentication routes: free registration, login, logout, and current-user.

The session is an HMAC-signed token (see app.auth) delivered as an HttpOnly
cookie so it rides along with image requests made by ``<img>`` / CSS.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from app import auth

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


def _set_session_cookie(response: Response, username: str) -> None:
    response.set_cookie(
        key=auth.COOKIE_NAME,
        value=auth.make_token(username),
        max_age=auth.TOKEN_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        path="/",
    )


@router.post("/register")
def register(creds: Credentials, response: Response) -> dict:
    username = auth.validate_username(creds.username)
    auth.create_user(username, creds.password)
    _set_session_cookie(response, username)
    return {"username": username}


@router.post("/login")
def login(creds: Credentials, response: Response) -> dict:
    username = auth.validate_username(creds.username)
    if not auth.authenticate(username, creds.password):
        # Avoid leaking which half is wrong.
        raise HTTPException(status_code=401, detail="Invalid username or password")
    _set_session_cookie(response, username)
    return {"username": username}


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(key=auth.COOKIE_NAME, path="/")
    return {"status": "ok"}


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    username: str = Depends(auth.get_current_user),
) -> dict:
    auth.change_password(username, body.old_password, body.new_password)
    return {"status": "ok"}


@router.get("/me")
def me(request: Request, username: str = Depends(auth.get_current_user)) -> dict:
    return {"username": username}
