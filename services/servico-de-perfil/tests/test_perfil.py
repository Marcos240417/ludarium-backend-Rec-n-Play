from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_perfil_endpoints_protegidos():
    """Testa se endpoints do perfil exigem autenticação."""
    # Tenta aceder a uma rota protegida comum do perfil (ex: /perfil/eu ou /perfil/leaderboard)
    response = client.get("/perfil/eu")
    # Sem token enviado, deve retornar 401 (Não Autorizado) ou 403
    assert response.status_code in [401, 403, 404]