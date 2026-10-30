import os
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import models, database, schemas
import httpx

SECRET_KEY = "ludarium_super_secret_key_jwt"
ALGORITHM = "HS256"

# Ajustado o tokenUrl para apontar para o Auth Service real (porta 8001)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/login")

app = FastAPI(title="Serviço de Campanhas e Desafios - Ludarium", version="1.0.0")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Montar diretório estático de frontend de forma segura (evita erros 404)
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")

# Evento de arranque assíncrono para criar as tabelas de forma segura
@app.on_event("startup")
async def startup_event():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def obter_utilizador_atual(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais de autenticação",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub") or payload.get("email")
        if email is None:
            raise credentials_exception
        return email
    except JWTError:
        raise credentials_exception

@app.get("/")
def raiz():
    return {"mensagem": "Serviço de Campanhas com autenticação JWT e vínculo por utilizador a funcionar!"}

# Função auxiliar assíncrona para popular dados iniciais de demonstração com selectinload
async def popular_dados_iniciais(db: AsyncSession):
    result = await db.execute(
        select(models.CampanhaModel).options(selectinload(models.CampanhaModel.objetivos))
    )
    campanhas = result.scalars().all()
    if campanhas:
        return campanhas

    c1 = models.CampanhaModel(
        titulo="Folclore Reimaginado",
        descricao="Transforme histórias da sua região em uma experiência jogável.",
        categoria="GAME JAM",
        nivel="Intermediário",
        participantes_qtd=1920,
        recompensa_xp=2500,
        formato="Equipe",
        progresso_porcentagem=35,
        dias_restantes=12
    )
    db.add(c1)
    await db.commit()
    await db.refresh(c1)
    
    objs = [
        ("Montar ou entrar em uma equipe", "até 02 de março", "2.500 XP", True),
        ("Registrar a ideia do projeto", "tema, mecânicas e escopo inicial", "2.500 XP", True),
        ("Publicar o primeiro devlog", "compartilhe os 15% de avanço", "2.500 XP", True),
        ("Enviar uma versão jogável", "build para windows, web ou mobile - até 28 fev", "2.500 XP", False),
        ("Avaliar 3 projetos", "2.500 XP feedbacks enviados", "2.500 XP", False),
        ("Publicar o projeto final", "teaser, itch.io/steam, demo", "2.500 XP", False),
        ("Participar da apresentação", "evento ao vivo com os estúdios", "2.500 XP", False),
    ]
    
    for tit, pra, rec, conc in objs:
        db.add(models.ObjetivoCampanhaModel(
            campanha_id=c1.id,
            titulo=tit,
            prazo=pra,
            recompensa_xp=rec,
            concluido=conc
        ))
    await db.commit()
    
    c2 = models.CampanhaModel(
        titulo="POO aplicada a sistemas de RPG",
        descricao="Aprenda orientação a objetos criando combate, inventário e habilidades.",
        categoria="TRILHAS DE ESTUDO",
        nivel="Iniciante",
        participantes_qtd=840,
        recompensa_xp=1800,
        formato="Individual",
        progresso_porcentagem=65,
        dias_restantes=8
    )
    db.add(c2)
    
    c3 = models.CampanhaModel(
        titulo="Performance Lab: Cidade Viva",
        descricao="Otimize uma cena urbana com centenas de agentes sem perder fidelidade.",
        categoria="DESAFIOS TÉCNICOS",
        nivel="Avançado",
        participantes_qtd=310,
        recompensa_xp=5000,
        formato="Individual",
        progresso_porcentagem=10,
        dias_restantes=20
    )
    db.add(c3)
    await db.commit()
    
    result_final = await db.execute(
        select(models.CampanhaModel).options(selectinload(models.CampanhaModel.objetivos))
    )
    return result_final.scalars().all()

@app.get("/progresso-usuario", response_model=schemas.UsuarioProgressoResponse)
async def obter_progresso_utilizador(db: AsyncSession = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    """Retorna o progresso, nível e XP do utilizador autenticado"""
    result = await db.execute(select(models.UsuarioProgressoModel))
    progresso = result.scalars().first()
    if not progresso:
        progresso = models.UsuarioProgressoModel(
            nivel=24,
            titulo_nivel="Criadora Experiente",
            xp_atual=11400,
            xp_proximo_nivel=15000,
            projetos_concluidos=7,
            badges_conquistados=12,
            mentorias=4
        )
        db.add(progresso)
        await db.commit()
        await db.refresh(progresso)
    return progresso

@app.get("/campanhas", response_model=list[schemas.CampanhaResponse])
async def listar_campanhas(db: AsyncSession = Depends(database.obter_base_de_dados)):
    """Lista todas as campanhas de forma segura e assíncrona"""
    campanhas = await popular_dados_iniciais(db)
    return campanhas

@app.post("/campanhas", response_model=schemas.CampanhaResponse, status_code=status.HTTP_201_CREATED)
async def criar_campanha(
    campanha: schemas.CampanhaCreate, 
    db: AsyncSession = Depends(database.obter_base_de_dados), 
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    """Cria uma nova campanha com os objetivos/relação carregados corretamente"""
    nova_campanha = models.CampanhaModel(
        titulo=campanha.titulo,
        descricao=campanha.descricao,
        categoria=campanha.categoria or "GAME JAM",
        nivel=campanha.nivel or "Iniciante",
        recompensa_xp=campanha.recompensa_xp or 2500,
        participantes_qtd=1,
        formato="Individual",
        progresso_porcentagem=0,
        dias_restantes=30,
        ativa=True
    )
    db.add(nova_campanha)
    await db.commit()
    
    # Recarrega a campanha com selectinload para evitar o erro MissingGreenlet na serialização dos objetivos
    result = await db.execute(
        select(models.CampanhaModel)
        .options(selectinload(models.CampanhaModel.objetivos))
        .filter(models.CampanhaModel.id == nova_campanha.id)
    )
    campanha_criada = result.scalars().first()
    
    return campanha_criada

@app.patch("/objetivos/{objetivo_id}/concluir", response_model=schemas.ObjetivoResponse)
async def concluir_objetivo(
    objetivo_id: int, 
    db: AsyncSession = Depends(database.obter_base_de_dados), 
    utilizador_email: str = Depends(obter_utilizador_atual),
    authorization: str = Header(None)
):
    """Alterna o estado de conclusão de uma tarefa no checklist e atribui recompensa de XP se concluído"""
    result = await db.execute(select(models.ObjetivoCampanhaModel).filter(models.ObjetivoCampanhaModel.id == objetivo_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado")
    
    obj.concluido = not obj.concluido
    await db.commit()
    await db.refresh(obj)

    if obj.concluido and authorization:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8005/perfil/adicionar-xp",
                    json={"xp": 100},
                    headers={"Authorization": authorization}
                )
        except Exception as e:
            print(f"Erro ao creditar XP da campanha: {e}")

    return obj