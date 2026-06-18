"""
FastAPI dependency providers.
Uses the same composition.py the CLI uses — the core never knows which surface it's on.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from salli.composition import Services, build_services
from salli.config import Settings, get_settings

_bearer = HTTPBearer(auto_error=True)


@lru_cache(maxsize=1)
def _services(settings: Settings) -> Services:
    return build_services(settings)


def get_services() -> Services:
    return _services(get_settings())


# ── Auth ───────────────────────────────────────────────────────────────────────


def _verify_jwt(token: str, settings: Settings) -> str:
    """
    Verify a Supabase-issued JWT and return the subject (user_id).
    In development (no SUPABASE_JWT_SECRET set) we accept any non-empty token
    and return it as the user_id so local testing works without Supabase.
    """
    secret = getattr(settings, "supabase_jwt_secret", "")
    if not secret:
        # Dev fallback — token IS the user_id
        return token

    try:
        from jose import jwt

        payload = jwt.decode(token, secret, algorithms=["HS256"])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return str(sub)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate token"
        ) from exc


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> str:
    return _verify_jwt(creds.credentials, settings)


# Convenient type aliases for route parameters
CurrentUser = Annotated[str, Depends(get_current_user)]
AppServices = Annotated[Services, Depends(get_services)]
