import os
from fastapi import FastAPI, Depends, HTTPException, status, Header
from sqlalchemy.orm import selectinload
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from pydantic import BaseModel
import models
import database
import schemas
import httpx

SECRET_KEY = "ludarium_super_secret_key_jwt"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/login")

app = FastAPI(title="Serviço de Perfil - Ludarium", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
        
    migrations = [
        "ALTER TABLE perfis_utilizadores ADD COLUMN IF NOT EXISTS nivel INTEGER DEFAULT 1;",
        "ALTER TABLE perfis_utilizadores ADD COLUMN IF NOT EXISTS xp_atual INTEGER DEFAULT 0;",
        "ALTER TABLE perfis_utilizadores ADD COLUMN IF NOT EXISTS xp_proximo_nivel INTEGER DEFAULT 1000;"
    ]
    
    for mig in migrations:
        try:
            async with database.engine.begin() as conn:
                await conn.execute(text(mig))
        except Exception as e:
            print(f"Aviso na migração DDL do perfil: {e}")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def obter_db():
    async for session in database.obter_base_de_dados():
        yield session

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

class XPRequest(BaseModel):
    xp: int

@app.put("/perfil/eu", response_model=schemas.PerfilCompletoResponse)
async def atualizar_perfil(
    dados: schemas.PerfilUpdate,
    db: AsyncSession = Depends(database.obter_base_de_dados),
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    result = await db.execute(
        select(models.PerfilModel)
        .options(
            selectinload(models.PerfilModel.links),
            selectinload(models.PerfilModel.comunidades),
            selectinload(models.PerfilModel.projetos_destaque),
            selectinload(models.PerfilModel.atividades),
            selectinload(models.PerfilModel.trofeus)
        )
        .filter(models.PerfilModel.utilizador_email == utilizador_email)
    )
    perfil = result.scalars().first()
    
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    if dados.nome is not None:
        perfil.nome = dados.nome
    if dados.arroba is not None:
        perfil.arroba = dados.arroba
    if dados.localizacao is not None:
        perfil.localizacao = dados.localizacao
    if dados.biografia is not None:
        perfil.biografia = dados.biografia
    if dados.badge_funcao is not None:
        perfil.badge_funcao = dados.badge_funcao

    if dados.links is not None:
        perfil.links.clear()
        for l in dados.links:
            novo_link = models.LinkModel(
                perfil_id=perfil.id,
                rotulo=l.rotulo,
                url=l.url
            )
            db.add(novo_link)

    await db.commit()
    
    result_final = await db.execute(
        select(models.PerfilModel)
        .options(
            selectinload(models.PerfilModel.links),
            selectinload(models.PerfilModel.comunidades),
            selectinload(models.PerfilModel.projetos_destaque),
            selectinload(models.PerfilModel.atividades),
            selectinload(models.PerfilModel.trofeus)
        )
        .filter(models.PerfilModel.id == perfil.id)
    )
    perfil_atualizado = result_final.scalars().first()
    
    return perfil_atualizado

@app.delete("/perfil/eu", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_perfil(
    db: AsyncSession = Depends(obter_db), 
    utilizador_email: str = Depends(obter_utilizador_atual),
    authorization: str = Header(None)
):
    result = await db.execute(select(models.PerfilModel).filter(models.PerfilModel.utilizador_email == utilizador_email))
    perfil = result.scalars().first()
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    for model_cls in [models.LinkModel, models.PerfilComunidadeModel, models.PerfilProjetoModel, models.PerfilAtividadeModel, models.PerfilTrofeuModel]:
        res = await db.execute(select(model_cls).filter(model_cls.perfil_id == perfil.id))
        for row in res.scalars().all():
            await db.delete(row)
    
    await db.delete(perfil)
    await db.commit()

    try:
        auth_service_url = "http://localhost:8001" 
        headers = {"Authorization": authorization} if authorization else {}
        async with httpx.AsyncClient() as client:
            await client.delete(f"{auth_service_url}/users/me", headers=headers)
    except Exception as e:
        print(f"Erro ao comunicar com o serviço de autenticação para apagar o utilizador: {e}")

    return None     


@app.get("/perfil/eu", response_model=schemas.PerfilResponse)
async def obter_perfil_completo(
    db: AsyncSession = Depends(database.obter_base_de_dados), 
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    result = await db.execute(
        select(models.PerfilModel)
        .options(
            selectinload(models.PerfilModel.links),
            selectinload(models.PerfilModel.comunidades),
            selectinload(models.PerfilModel.projetos_destaque),
            selectinload(models.PerfilModel.atividades),
            selectinload(models.PerfilModel.trofeus)
        )
        .filter(models.PerfilModel.utilizador_email == utilizador_email)
    )
    perfil = result.scalars().first()
    
    if not perfil:
        perfil = models.PerfilModel(
            utilizador_email=utilizador_email,
            nome="",
            arroba=f"@{utilizador_email.split('@')[0]}",
            localizacao="",
            biografia="",
            badge_funcao="NOVO MEMBRO",
            nivel=1,
            xp_atual=0,
            xp_proximo_nivel=1000,
            seguidores_qtd=0,
            seguindo_qtd=0,
            projetos_qtd=0,
            contribuicoes_anuais=0
        )
        db.add(perfil)
        await db.commit()
        await db.refresh(perfil)
        
        result = await db.execute(
            select(models.PerfilModel)
            .options(
                selectinload(models.PerfilModel.links),
                selectinload(models.PerfilModel.comunidades),
                selectinload(models.PerfilModel.projetos_destaque),
                selectinload(models.PerfilModel.atividades),
                selectinload(models.PerfilModel.trofeus)
            )
            .filter(models.PerfilModel.utilizador_email == utilizador_email)
        )
        perfil = result.scalars().first()

    return perfil

@app.post("/perfil/adicionar-xp")
async def adicionar_xp(
    dados: XPRequest, 
    db: AsyncSession = Depends(obter_db), 
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    quantidade = dados.xp
    
    result = await db.execute(select(models.PerfilModel).filter(models.PerfilModel.utilizador_email == utilizador_email))
    perfil = result.scalars().first()
    
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado para este utilizador.")
    
    perfil.xp_atual += quantidade
    
    while perfil.xp_atual >= perfil.xp_proximo_nivel:
        perfil.xp_atual -= perfil.xp_proximo_nivel
        perfil.nivel += 1
        perfil.xp_proximo_nivel = int(perfil.xp_proximo_nivel * 1.2)
        
    await db.commit()
    await db.refresh(perfil)
    
    return {
        "mensagem": f"+{quantidade} XP adicionados com sucesso!",
        "nivel": perfil.nivel,
        "xp_atual": perfil.xp_atual,
        "xp_proximo_nivel": perfil.xp_proximo_nivel
    }    

@app.get("/perfil/leaderboard")
async def obter_leaderboard(db: AsyncSession = Depends(obter_db)):
    result = await db.execute(select(models.PerfilModel).order_by(models.PerfilModel.xp_atual.desc()).limit(10))
    perfis = result.scalars().all()
    
    ranking = []
    for p in perfis:
        ranking.append({
            "nome": p.nome or p.arroba,
            "arroba": p.arroba,
            "nivel": p.nivel,
            "xp_atual": p.xp_atual
        })
    return ranking

@app.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_utilizador_auth(
    db: AsyncSession = Depends(obter_db), 
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    result = await db.execute(select(models.UserModel).filter(models.UserModel.email == utilizador_email))
    utilizador = result.scalars().first()
    
    if utilizador:
        await db.delete(utilizador)
        await db.commit()
        
    return None