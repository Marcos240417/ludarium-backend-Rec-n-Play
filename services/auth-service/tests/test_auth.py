from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_raiz_auth():
    """Testa se o serviço de autenticação está online."""
    response = client.get("/")
    assert response.status_code == 200

def test_login_credenciais_invalidas():
    """Testa se o login rejeita credenciais incorretas corretamente."""
    response = client.post(
        "/login", 
        data={"username": "naoexiste@ludarium.com", "password": "wrongpassword"}
    )
    # Deve retornar erro de autorização ou credenciais inválidas
    assert response.status_code in [400, 401]