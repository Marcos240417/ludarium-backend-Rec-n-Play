from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_projetos_raiz():
    """Testa se o serviço de projetos está online."""
    response = client.get("/")
    assert response.status_code in [200, 404]

def test_listar_projetos():
    """Testa a listagem pública de projetos."""
    response = client.get("/projects")
    assert response.status_code == 200
    assert isinstance(response.json(), list)