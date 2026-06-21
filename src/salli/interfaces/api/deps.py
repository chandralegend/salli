"""
FastAPI dependency providers.
Uses the same composition.py the CLI uses — the core never knows which surface it's on.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from salli.composition import Services, build_services
from salli.config import Settings, get_settings

_bearer = HTTPBearer(auto_error=True)


_services_singleton: Services | None = None
_checkpointer = None


def set_checkpointer(cp) -> None:
    """Called from the app lifespan before the first request."""
    global _checkpointer
    _checkpointer = cp


def get_services() -> Services:
    global _services_singleton
    if _services_singleton is None:
        _services_singleton = build_services(get_settings(), checkpointer=_checkpointer)
    return _services_singleton


# ── Auth ───────────────────────────────────────────────────────────────────────


def _decode_jwt(token: str, settings: Settings) -> tuple[str, str | None]:
    """
    Verify a Supabase-issued JWT and return (user_id, email).
    In development (no SUPABASE_JWT_SECRET set) we accept any non-empty token
    and return it as the user_id so local testing works without Supabase.
    """
    secret = settings.supabase_jwt_secret
    if not secret:
        # Dev fallback — token IS the user_id, no email
        return token, None

    try:
        from jose import jwt

        payload = jwt.decode(
            token, secret, algorithms=["HS256"], audience="authenticated"
        )
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return str(sub), payload.get("email")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate token"
        ) from exc


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> str:
    return _decode_jwt(creds.credentials, settings)[0]


def get_current_email(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> str | None:
    return _decode_jwt(creds.credentials, settings)[1]


# Convenient type aliases for route parameters
CurrentUser = Annotated[str, Depends(get_current_user)]
CurrentEmail = Annotated["str | None", Depends(get_current_email)]
AppServices = Annotated[Services, Depends(get_services)]
