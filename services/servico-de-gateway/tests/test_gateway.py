from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_raiz_gateway():
    """Testa se o API Gateway está online e a responder."""
    response = client.get("/")
    assert response.status_code in [200, 404]