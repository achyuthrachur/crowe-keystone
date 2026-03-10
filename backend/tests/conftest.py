"""Shared pytest configuration for all test modules."""
import asyncio
import pytest


@pytest.fixture(scope="session")
def event_loop_policy():
    """Return the asyncio event loop policy."""
    return asyncio.DefaultEventLoopPolicy()


@pytest.fixture(scope="session")
def shared_event_loop():
    """Return the current session event loop (managed by pytest-asyncio).

    With asyncio_default_fixture_loop_scope="session", pytest-asyncio already
    creates and sets a session-scoped event loop before any fixtures run.
    We yield that loop rather than creating a second one — if we created a new
    loop and replaced the current one, async session fixtures (like create_tables
    in test_phase1.py) would have already bound engine connections to the original
    loop, causing 'Future attached to a different loop' errors in TestClient tests.
    """
    loop = asyncio.get_event_loop()
    yield loop
    # Do NOT close — pytest-asyncio owns this loop's lifecycle.
