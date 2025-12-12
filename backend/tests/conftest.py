"""
Pytest configuration and fixtures for API testing.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import database


@pytest_asyncio.fixture(scope="function")
async def client():
    """
    Create an async test client for the FastAPI app.
    
    This fixture connects to the real database for integration testing.
    """
    # Connect to database
    await database.connect()
    
    # Create async client
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    # Disconnect from database
    await database.disconnect()


@pytest_asyncio.fixture(scope="function")
async def client_no_db():
    """
    Create an async test client without database connection.
    
    Useful for testing endpoints that don't require database access.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
