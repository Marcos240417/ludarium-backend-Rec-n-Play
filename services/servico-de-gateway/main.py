from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI(title="Gateway de API - Ludarium", version="1.0.0")

# Configuração de CORS para permitir requisições do Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mapeamento corrigido com as portas reais que colocámos a correr nos terminais
SERVICOS = {
    "auth": "http://localhost:8001",
    "projetos": "http://localhost:8081",
    "campanhas": "http://localhost:8082",
    "comunidade": "http://localhost:8083",
    "perfil": "http://localhost:8084",
}

client = httpx.AsyncClient(timeout=30.0)

@app.on_event("shutdown")
async def shutdown_event():
    await client.aclose()

@app.get("/")
def raiz():
    return {"mensagem": "Gateway de API do Ludarium a funcionar perfeitamente!"}

async def reencaminhar_pedido(servico_url: str, request: Request, path: str):
    url = f"{servico_url}/{path}"
    headers = dict(request.headers)
    headers.pop("host", None) # Remove o host original para evitar conflitos
    
    body = await request.body()
    params = request.query_params

    try:
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
            params=params
        )
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers)
        )
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="O microsserviço de destino encontra-se indisponível ou offline.")

# --- Rotas de Autenticação ---
@app.api_route("/login", methods=["POST"])
async def gw_login(request: Request):
    return await reencaminhar_pedido(SERVICOS["auth"], request, "login")

@app.api_route("/register", methods=["POST"])
async def gw_register(request: Request):
    return await reencaminhar_pedido(SERVICOS["auth"], request, "register")

@app.api_route("/me", methods=["GET"])
async def gw_me(request: Request):
    return await reencaminhar_pedido(SERVICOS["auth"], request, "me")

# --- Rotas de Projetos ---
@app.api_route("/projects", methods=["GET", "POST"])
async def gw_projects(request: Request):
    return await reencaminhar_pedido(SERVICOS["projetos"], request, "projects")

@app.api_route("/projects/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def gw_projects_sub(request: Request, path: str):
    return await reencaminhar_pedido(SERVICOS["projetos"], request, f"projects/{path}")

@app.api_route("/sandbox/{path:path}", methods=["GET"])
async def gw_sandbox(request: Request, path: str):
    return await reencaminhar_pedido(SERVICOS["projetos"], request, f"sandbox/{path}")

@app.api_route("/posters/{path:path}", methods=["GET"])
async def gw_posters(request: Request, path: str):
    return await reencaminhar_pedido(SERVICOS["projetos"], request, f"posters/{path}")

# --- Rotas de Perfil ---
@app.api_route("/perfil", methods=["GET", "PUT", "PATCH"])
async def gw_perfil_root(request: Request):
    return await reencaminhar_pedido(SERVICOS["perfil"], request, "perfil")

@app.api_route("/perfil/{path:path}", methods=["GET", "PUT", "PATCH", "POST"])
async def gw_perfil_sub(request: Request, path: str):
    return await reencaminhar_pedido(SERVICOS["perfil"], request, f"perfil/{path}")

# --- Rotas de Comunidade ---
@app.api_route("/publicacoes", methods=["GET", "POST"])
async def gw_publicacoes(request: Request):
    return await reencaminhar_pedido(SERVICOS["comunidade"], request, "publicacoes")

@app.api_route("/publicacoes/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def gw_publicacoes_sub(request: Request, path: str):
    return await reencaminhar_pedido(SERVICOS["comunidade"], request, f"publicacoes/{path}")

@app.api_route("/oportunidades", methods=["GET"])
async def gw_oportunidades(request: Request):
    return await reencaminhar_pedido(SERVICOS["comunidade"], request, "oportunidades")

@app.api_route("/recomendados/skills", methods=["GET"])
async def gw_skills(request: Request):
    return await reencaminhar_pedido(SERVICOS["comunidade"], request, "recomendados/skills")

# --- Rotas de Campanhas e Desafios ---
@app.api_route("/progresso-usuario", methods=["GET"])
async def gw_progresso(request: Request):
    return await reencaminhar_pedido(SERVICOS["campanhas"], request, "progresso-usuario")

@app.api_route("/campanhas", methods=["GET"])
async def gw_campanhas(request: Request):
    return await reencaminhar_pedido(SERVICOS["campanhas"], request, "campanhas")

@app.api_route("/objetivos/{path:path}", methods=["GET", "PATCH"])
async def gw_objetivos(request: Request, path: str):
    return await reencaminhar_pedido(SERVICOS["campanhas"], request, f"objetivos/{path}")