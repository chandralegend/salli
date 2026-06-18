"""
Salli FastAPI application.

Thin HTTP adapter over the same composition root the CLI uses.
All business logic lives in the application services; this module only wires
routing, CORS, error handling, and the lifespan startup/shutdown.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from salli.config import get_settings
from salli.interfaces.api.deps import get_services
from salli.interfaces.api.routers import (
    accounts,
    agent,
    auth,
    entries,
    ledger,
    reminders,
    statements,
    tax,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the DB connection pool on startup so the first request isn't slow
    svc = get_services()
    _ = svc  # triggers _services() lru_cache → make_session_factory()
    yield
    # SQLAlchemy async engine disposes itself on GC; nothing explicit needed


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Salli API",
        description="Privacy-first personal finance & tax for Sri Lanka",
        version="0.1.0",
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Production origins are locked down via environment variable
    origins = (
        ["*"]
        if settings.environment == "development"
        else getattr(settings, "allowed_origins", ["https://salli.lk"])
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth.router)
    app.include_router(accounts.router)
    app.include_router(entries.router)
    app.include_router(ledger.router)
    app.include_router(tax.router)
    app.include_router(agent.router)
    app.include_router(statements.router)
    app.include_router(reminders.router)

    # ── Exception handlers ────────────────────────────────────────────────────
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc)},
        )

    @app.exception_handler(KeyError)
    async def key_error_handler(request: Request, exc: KeyError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": f"Not found: {exc}"},
        )

    # ── Health ────────────────────────────────────────────────────────────────
    @app.get("/healthz", tags=["meta"])
    async def health():
        return {"status": "ok", "version": app.version}

    return app


app = create_app()
