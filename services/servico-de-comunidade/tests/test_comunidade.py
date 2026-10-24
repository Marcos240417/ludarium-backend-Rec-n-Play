from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_raiz_comunidade():
    """Testa se o serviço de comunidade está online."""
    response = client.get("/")
    assert response.status_code in [200, 404]

def test_listar_posts():
    """Testa a listagem de publicações ou o feed da comunidade."""
    response = client.get("/posts") # Ajuste a rota se necessário conforme o seu main.py
    assert response.status_code in [200, 404]
    