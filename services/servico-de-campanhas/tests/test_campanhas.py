from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_raiz_campanhas():
    """Testa se o serviço de campanhas está online."""
    response = client.get("/")
    assert response.status_code == 200
    assert "Campanhas" in response.json()["mensagem"]

def test_listar_campanhas():
    """Testa a listagem de campanhas e respetivos objetivos."""
    response = client.get("/campanhas")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    
    # Valida campos da primeira campanha
    primeira = data[0]
    assert "titulo" in primeira
    assert "categoria" in primeira