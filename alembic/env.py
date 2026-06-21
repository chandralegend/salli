import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

# Ensure src/ is on the path so `salli` is importable during migrations
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Allow DATABASE_URL env var to override alembic.ini for containerised runs
if db_url := os.environ.get("DATABASE_URL"):
    config.set_main_option("sqlalchemy.url", db_url)

# Import all ORM models so Alembic can auto-detect schema changes
from salli.adapters.db.models import Base  # noqa: E402

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


_EXCLUDED_TABLES = {
    "checkpoint_blobs",
    "checkpoint_migrations",
    "checkpoint_writes",
    "checkpoints",
}


def _include_object(obj, name, type_, reflected, compare_to):
    """Exclude external tables (e.g. LangGraph checkpointer) and their indexes
    from autogenerate, so migrations never try to drop them."""
    if type_ == "table" and name in _EXCLUDED_TABLES:
        return False
    if type_ == "index":
        table_name = getattr(getattr(obj, "table", None), "name", None)
        if table_name in _EXCLUDED_TABLES:
            return False
        if name and any(name.startswith(t) for t in _EXCLUDED_TABLES):
            return False
    return True


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=_include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    url = config.get_main_option("sqlalchemy.url")
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
