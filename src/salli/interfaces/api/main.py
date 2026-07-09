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
    advisor,
    agent,
    auth,
    billing,
    documents,
    entries,
    fi,
    ledger,
    onboarding,
    reminders,
    statements,
    tax,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import logging

    log = logging.getLogger(__name__)
    settings = get_settings()

    # ── PostgreSQL checkpointer for LangGraph agent conversations ─────────────
    # Converts asyncpg URL → psycopg3 URL (different drivers, same DB)
    pg_url = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")

    checkpointer_ctx = None
    try:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        checkpointer_ctx = AsyncPostgresSaver.from_conn_string(pg_url)
        checkpointer = await checkpointer_ctx.__aenter__()
        await checkpointer.setup()  # creates checkpoint tables if not present
        from salli.interfaces.api.deps import set_checkpointer

        set_checkpointer(checkpointer)
        log.info("LangGraph PostgreSQL checkpointer initialised")
    except Exception as exc:
        log.warning("PostgreSQL checkpointer unavailable (%s) — falling back to in-memory", exc)

    # ── Warm the DB connection pool ───────────────────────────────────────────
    svc = get_services()
    _ = svc

    yield

    # ── Teardown ──────────────────────────────────────────────────────────────
    if checkpointer_ctx is not None:
        try:
            await checkpointer_ctx.__aexit__(None, None, None)
        except Exception:
            pass


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
    origins = ["*"] if settings.environment == "development" else settings.allowed_origins
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
    app.include_router(documents.router)
    app.include_router(onboarding.router)
    app.include_router(statements.router)
    app.include_router(reminders.router)
    app.include_router(billing.router)
    app.include_router(fi.router)
    app.include_router(advisor.router)

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
