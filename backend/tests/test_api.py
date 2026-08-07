"""
API integration tests using FastAPI TestClient.
Run: pytest tests/test_api.py -v
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

# Use SQLite for testing
os.environ["DATABASE_URL"] = "sqlite:///./test_db.sqlite"
os.environ["REDIS_URL"]    = "redis://localhost:6379/1"  # test DB
os.environ["MONGODB_URL"]  = "mongodb://localhost:27017"

from main import app
from database import engine, Base

# Create all tables before any tests run
Base.metadata.create_all(bind=engine)

client = TestClient(app)


@pytest.fixture(autouse=True, scope="session")
def create_tables():
    """Ensure all tables exist for the test session."""
    Base.metadata.create_all(bind=engine)
    yield
    # Optionally clean up
    Base.metadata.drop_all(bind=engine)


class TestRootEndpoints:
    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "version" in data

    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_docs_accessible(self):
        response = client.get("/docs")
        assert response.status_code == 200


class TestWebhook:
    SAMPLE_PAYLOAD = {
        "object": "page",
        "entry": [{
            "id": "123",
            "time": 1690000001,
            "changes": [{
                "value": {
                    "message": "I love this product! romba nalla",
                    "comment_id": "test_001",
                },
                "field": "feed",
            }],
        }],
    }

    def test_webhook_verification(self):
        response = client.get("/webhook", params={
            "hub.mode":         "subscribe",
            "hub.verify_token": "your_secure_verify_token_here",
            "hub.challenge":    "challenge_abc123",
        })
        assert response.status_code == 200
        assert response.text == "challenge_abc123"

    def test_webhook_invalid_token(self):
        response = client.get("/webhook", params={
            "hub.mode":         "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge":    "abc",
        })
        assert response.status_code == 403

    def test_webhook_post(self):
        response = client.post("/webhook", json=self.SAMPLE_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["status"] == "success"


class TestAuth:
    TEST_USER = {"email": "test@example.com", "password": "SecurePass123!"}

    def test_register(self):
        response = client.post("/auth/register", json=self.TEST_USER)
        # 201 on first run, 409 if already exists
        assert response.status_code in (201, 409)

    def test_login_valid(self):
        # Ensure user exists first
        client.post("/auth/register", json=self.TEST_USER)
        response = client.post("/auth/login", json=self.TEST_USER)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_invalid_password(self):
        response = client.post("/auth/login", json={
            "email":    "test@example.com",
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    def test_me_without_token(self):
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_me_with_token(self):
        client.post("/auth/register", json=self.TEST_USER)
        login = client.post("/auth/login", json=self.TEST_USER)
        if login.status_code == 200:
            token = login.json()["access_token"]
            response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert response.status_code == 200
            assert response.json()["email"] == self.TEST_USER["email"]


class TestMetricsAPI:
    def test_metrics_returns_200(self):
        response = client.get("/api/metrics")
        assert response.status_code == 200

    def test_metrics_structure(self):
        response = client.get("/api/metrics")
        data = response.json()
        assert "summary" in data
        assert "trend" in data
        assert "data" in data
        summary = data["summary"]
        assert "total_comments" in summary
        assert "positive" in summary
        assert "negative" in summary
        assert "sarcastic" in summary

    def test_comments_list(self):
        response = client.get("/api/comments")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "data" in data

    def test_comments_filter_by_sentiment(self):
        response = client.get("/api/comments?sentiment=positive")
        assert response.status_code == 200
