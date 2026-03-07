"""Shared pytest configuration for all test modules."""
import asyncio
import pytest


@pytest.fixture(scope="session")
def event_loop_policy():
    """Return the asyncio event loop policy."""
    return asyncio.DefaultEventLoopPolicy()


@pytest.fixture(scope="session")
def shared_event_loop():
    """Create a persistent event loop that lives for the entire test session.

    Use this loop (via loop.run_until_complete()) for async DB setup/teardown
    in synchronous test fixtures instead of asyncio.run(), which closes the loop
    and breaks subsequent asyncpg connections in TestClient requests.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()
    asyncio.set_event_loop(None)
