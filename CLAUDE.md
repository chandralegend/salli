# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (requires uv)
uv sync --group dev

# Run all tests
uv run pytest

# Run a single test file
uv run pytest tests/unit/domain/test_accounting.py

# Run a single test by name
uv run pytest -k "test_journal_entry_must_balance"

# Run with coverage
uv run pytest --cov

# Lint + format check
uv run ruff check src/ tests/
uv run ruff format --check src/ tests/

# Fix lint issues
uv run ruff check --fix src/ tests/
uv run ruff format src/ tests/

# Type check
uv run pyright src/

# Run database migrations
uv run alembic upgrade head

# Generate a new migration (after editing adapters/db/models.py)
uv run alembic revision --autogenerate -m "description"

# CLI (Phase 1 — once interfaces/cli is wired up)
uv run salli --help
```

## Architecture

### Hexagonal (ports & adapters)

The domain core has **no I/O and no framework imports**. Everything external is hidden behind *ports* (abstract interfaces in `application/ports.py`). *Adapters* implement those ports. The CLI and (later) the FastAPI app are just two *interface adapters* that construct the same services via `composition.py`.

```
domain/       pure Python — no sqlalchemy, no fastapi, no httpx
application/  use-cases (services) + port interfaces
adapters/     concrete implementations of ports (db, llm, storage, fx, parsing)
interfaces/   cli/ (Phase 1) and api/ (Phase 2) — thin wrappers over services
composition.py  single place adapters are bound to ports
config.py       pydantic-settings, env-driven
```

The CLI and the API both call `build_services(settings)` from `composition.py`, so the core is exercised identically from both surfaces.

### Build order

1. **Core + CLI first** — all domain logic runs from the terminal before any HTTP server exists.
2. **FastAPI layer** — added in Phase 2; wraps the same services over async HTTP + SSE for agent streaming.
3. **Clients** — Next.js (web) + React Native (mobile) in Phase 3.

### Domain model invariants (non-negotiable)

- **LLM never computes money or tax.** Numbers reach the user only via deterministic engine output or tool results. The LLM parses documents, explains results, and drafts guidance.
- **Double-entry entries are immutable.** Corrections use reversing entries. Never edit or delete a posted `JournalEntry`.
- **Money is always `decimal.Decimal` in the domain; `BIGINT` minor units in the DB.** A float anywhere in the money path is a bug.
- **Tax packs are versioned `(country, year, version)`.** Every stored `TaxComputation` records the pack version so historical returns remain reproducible after rate changes.

### Tax engine

`domain/tax/engine.py` exports a pure function `compute(ledger_view, pack) -> TaxComputation`. It applies the pack's rate bands to taxable income **after** deducting personal relief, then subtracts credits (APIT, AIT, FTC). The engine never calls the LLM.

Tax packs live in `domain/tax/packs/`. The first pack is Sri Lanka 2025/26 (`lk_2025_26.py`): LKR 1,800,000 personal relief, bands 6/18/24/30/36%, 15% final tax on foreign service income remitted via bank, credits for APIT/AIT/FTC.

### Agents (LangGraph)

Two distinct things in `domain/agents/`:

- **`tax_agent.py`** — conversational agent (`create_agent`) with read-only tools backed by the engine. Uses `AsyncPostgresSaver` checkpointer for per-thread persistence.
- **`return_workflow.py`** — deterministic `StateGraph` for return preparation: gather → compute → map_to_cages → review (human `interrupt()`) → finalize. The same interrupt gate will guard agent-assisted filing when/if an IRD individual-IIT API appears.

### Test layout

| Directory | What goes there |
|---|---|
| `tests/unit/` | Pure domain logic — no DB, no LLM |
| `tests/properties/` | Hypothesis property tests for ledger invariants (trial balance nets zero, reversing restores balance, multi-currency reconciles) |
| `tests/golden/` | IRD worked examples → expected `TaxComputation` JSON; a pack is wrong until these pass |
| `tests/integration/` | Adapter tests against a real DB / test doubles |

### Configuration

All config is in `config.py` via `pydantic-settings` and reads from environment / `.env`. Required keys: `DATABASE_URL`, `ANTHROPIC_API_KEY`. Optional: `SUPABASE_*`, `LANGSMITH_API_KEY`.

### Adding a new tax pack

1. Add `domain/tax/packs/<country>_<year>.py` declaring a `TaxPack` dataclass instance.
2. Register it in `domain/tax/packs/registry.py`.
3. Add golden tests in `tests/golden/` using IRD/revenue-authority worked examples.
4. A chartered accountant must review the pack before it is used in production.
