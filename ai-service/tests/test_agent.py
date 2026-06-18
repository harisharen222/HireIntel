import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_agent_run_missing_auth():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/agent/run", json={"job_id": "job_123", "top_k": 2})
    assert response.status_code == 403

# Real tests would mock the DB and Groq to verify the Graph logic
