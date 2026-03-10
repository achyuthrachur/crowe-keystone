import os
from logging.config import fileConfig

from sqlalchemy import pool
from alembic import context

# Load .env for local dev
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use asyncpg for migrations — same driver as the app, no psycopg2 needed
database_url = os.environ.get("DATABASE_URL", "")
if database_url:
    url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    url = url.replace("postgresql+asyncpg+asyncpg://", "postgresql+asyncpg://")
    config.set_main_option("sqlalchemy.url", url)

# Import models for autogenerate
from src.database import Base  # noqa: F401, E402
import src.models  # noqa: F401, E402

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine

    url = config.get_main_option("sqlalchemy.url")

    def do_run_migrations(connection):
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()

    async def run_async_migrations() -> None:
        connectable = create_async_engine(url, poolclass=pool.NullPool)
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
        await connectable.dispose()

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
