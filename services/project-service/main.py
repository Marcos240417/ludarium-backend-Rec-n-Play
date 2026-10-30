import os
import shutil
import zipfile
from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File, Form, Header
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
import models, database, schemas
import httpx

SECRET_KEY = "ludarium_super_secret_key_jwt"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/login")

# 1. Instanciar a aplicação FastAPI primeiro
app = FastAPI(title="Ludarium Project & Feed Service", version="1.0.0")

# 2. Ativar CORS logo em seguida
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caminho base absoluto do diretório onde este main.py está localizado
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 3. Montagem segura da pasta estática correta (home.frontend) por caminho absoluto
FRONTEND_DIR = os.path.join(BASE_DIR, "home.frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")

# 4. Montar a pasta externa do painel de administração (admin-dashboard) por caminho absoluto 
ADMIN_DIR = os.path.abspath(os.path.join(BASE_DIR, "../admin-dashboard"))
if not os.path.exists(ADMIN_DIR):
    os.makedirs(ADMIN_DIR, exist_ok=True)
app.mount("/admin-dashboard", StaticFiles(directory=ADMIN_DIR), name="admin-dashboard")

# 5. Evento de arranque assíncrono para criar tabelas e aplicar auto-correções na base de dados
@app.on_event("startup")
async def startup_event():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
        
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS favorito INTEGER DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS build_path VARCHAR;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS executavel_navegador INTEGER DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS poster_path VARCHAR;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner VARCHAR;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id VARCHAR;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS campaign_id INTEGER;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS members VARCHAR;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Ativo';"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS inspection_reason VARCHAR;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS inspection_message VARCHAR;"))
        await conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS inspection_reply VARCHAR;"))

DIRETORIO_BUILDS = os.path.join(BASE_DIR, "sandbox_builds")
DIRETORIO_POSTERS = os.path.join(BASE_DIR, "sandbox_posters")

os.makedirs(DIRETORIO_BUILDS, exist_ok=True)
os.makedirs(DIRETORIO_POSTERS, exist_ok=True)

app.mount("/sandbox", StaticFiles(directory=DIRETORIO_BUILDS), name="sandbox")
app.mount("/posters", StaticFiles(directory=DIRETORIO_POSTERS), name="posters")

class InspectionRequest(BaseModel):
    reason: str = "Revisão necessária"
    deadline_days: int = 7
    report_message: str = "Por favor, corrija os pontos indicados."
    status: str = "Sob Inspeção (Aguardando Correção)"

class InspectionReplyRequest(BaseModel):
    reply_message: str

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
def ler_raiz():
    return {"mensagem": "Project Service com autenticação JWT, suporte a builds web, posters e inspeção a funcionar!"}

@app.get("/projects", response_model=list[schemas.ProjectResponse])
@app.get("/projects/", response_model=list[schemas.ProjectResponse])
async def listar_projetos(tag: str | None = Query(None), db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(
        select(models.ProjectModel).options(selectinload(models.ProjectModel.comentarios))
    )
    projetos = result.scalars().all()
    
    if not projetos:
        p1 = models.ProjectModel(
            title="Neon Afterlight",
            studio="Northwind Studio",
            description="Uma aventura narrativa cyberpunk sobre memórias perdidas em uma cidade que nunca amanhece.",
            progress=75,
            tags="unity,2d,narrative",
            likes=2400,
            favorito=0,
            executavel_navegador=1,
            build_path="sandbox_builds/neon_afterlight",
            poster_path=None,
            status="Ativo"
        )
        db.add(p1)
        await db.commit()
        await db.refresh(p1)
        
        c1 = models.ProjectCommentModel(
            project_id=p1.id,
            autor="Bruno H.",
            autor_arroba="@brunoh",
            conteudo="A direção de arte está espetacular!"
        )
        db.add(c1)
        await db.commit()
        
        p2 = models.ProjectModel(
            title="Mossvale",
            studio="Bruno H. e 2",
            description="RPG acolhedor de exploração e alquimia, feito em pixel art para tardes sem pressa.",
            progress=65,
            tags="godot,2d,pixel art",
            likes=1800,
            favorito=1,
            executavel_navegador=1,
            build_path="sandbox_builds/mossvale",
            poster_path=None,
            status="Ativo"
        )
        db.add(p2)
        await db.commit()
        
        result = await db.execute(
            select(models.ProjectModel).options(selectinload(models.ProjectModel.comentarios))
        )
        projetos = result.scalars().all()
    
    resultado = []
    for p in projetos:
        p_tags = [t.strip() for t in p.tags.split(",") if t.strip()] if p.tags else []
        if tag and tag.lower() not in [t.lower() for t in p_tags]:
            continue
            
        comentarios_formatados = [
            {
                "id": c.id,
                "project_id": c.project_id,
                "autor": c.autor,
                "autor_arroba": c.autor_arroba,
                "conteudo": c.conteudo
            } for c in p.comentarios
        ]
        
        resultado.append({
            "id": p.id,
            "title": p.title,
            "studio": p.studio,
            "description": p.description,
            "progress": p.progress,
            "tags": p_tags,
            "likes": p.likes,
            "favorito": p.favorito,
            "executavel_navegador": p.executavel_navegador,
            "build_path": p.build_path,
            "poster_path": p.poster_path,
            "owner": p.owner,
            "user_id": p.user_id,
            "campaign_id": getattr(p, 'campaign_id', None),
            "members": getattr(p, 'members', ""),
            "status": getattr(p, 'status', 'Ativo'),
            "inspection_reason": getattr(p, 'inspection_reason', None),
            "inspection_message": getattr(p, 'inspection_message', None),
            "inspection_reply": getattr(p, 'inspection_reply', None),
            "comments_count": len(comentarios_formatados),
            "comentarios": comentarios_formatados
        })
    return resultado

@app.post("/projects", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
@app.post("/projects/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
async def criar_projeto_root(
    title: str = Form(...),
    studio: str = Form("Estúdio Independente"),
    description: str = Form(...),
    progress: int = Form(100),
    tags: str = Form(""),
    executavel_navegador: int | str = Form(0),
    campaign_id: int | None = Form(None),
    members: str = Form(""),
    poster: UploadFile | None = None,
    build_file: UploadFile | None = None,
    db: AsyncSession = Depends(database.get_db),
    token: str | None = Depends(OAuth2PasswordBearer(tokenUrl="http://localhost:8001/login", auto_error=False))
):
    utilizador_email = "user1@user.com"
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            utilizador_email = payload.get("sub") or payload.get("email") or "user1@user.com"
        except Exception:
            pass

    exec_nav_int = 1 if str(executavel_navegador).lower() in ["true", "1", "on"] else 0

    poster_path = None
    if poster:
        os.makedirs(DIRETORIO_POSTERS, exist_ok=True)
        poster_filename = f"{title.lower().replace(' ', '_')}_{poster.filename}"
        poster_path = f"/posters/{poster_filename}"
        caminho_fisico_poster = os.path.join(DIRETORIO_POSTERS, poster_filename)
        with open(caminho_fisico_poster, "wb") as buffer:
            shutil.copyfileobj(poster.file, buffer)

    caminho_extraido = None
    pasta_slug = title.lower().replace(" ", "_")
    
    if exec_nav_int and build_file:
        pasta_projeto = os.path.join(DIRETORIO_BUILDS, pasta_slug)
        if os.path.exists(pasta_projeto):
            shutil.rmtree(pasta_projeto)
        os.makedirs(pasta_projeto, exist_ok=True)
        
        zip_path = os.path.join(pasta_projeto, "build.zip")
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(build_file.file, buffer)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(pasta_projeto)
        
        os.remove(zip_path)
        
        html_encontrado = None
        for root, dirs, files in os.walk(pasta_projeto):
            for file in files:
                if file.lower().endswith('.html'):
                    html_encontrado = os.path.join(root, file)
                    break
            if html_encontrado:
                break

        destino_index = os.path.join(pasta_projeto, "index.html")
        if html_encontrado and os.path.abspath(html_encontrado) != os.path.abspath(destino_index):
            shutil.copy(html_encontrado, destino_index)

        caminho_extraido = f"sandbox_builds/{pasta_slug}"

    novo_projeto = models.ProjectModel(
        title=title,
        studio=studio,
        description=description,
        progress=progress,
        tags=tags,
        executavel_navegador=exec_nav_int,
        build_path=caminho_extraido,
        poster_path=poster_path,
        owner=utilizador_email,
        user_id=utilizador_email,
        campaign_id=campaign_id,
        members=members,
        status="Ativo"
    )

    db.add(novo_projeto)
    await db.commit()
    await db.refresh(novo_projeto)

    p_tags = [t.strip() for t in novo_projeto.tags.split(",") if t.strip()] if novo_projeto.tags else []
    
    return {
        "id": novo_projeto.id,
        "title": novo_projeto.title,
        "studio": novo_projeto.studio,
        "description": novo_projeto.description,
        "progress": novo_projeto.progress,
        "tags": p_tags,
        "likes": getattr(novo_projeto, 'likes', 0),
        "favorito": getattr(novo_projeto, 'favorito', False),
        "executavel_navegador": novo_projeto.executavel_navegador,
        "build_path": novo_projeto.build_path,
        "poster_path": novo_projeto.poster_path,
        "owner": novo_projeto.owner,
        "user_id": novo_projeto.user_id,
        "campaign_id": getattr(novo_projeto, 'campaign_id', None),
        "members": getattr(novo_projeto, 'members', ""),
        "status": getattr(novo_projeto, 'status', 'Ativo'),
        "inspection_reason": getattr(novo_projeto, 'inspection_reason', None),
        "inspection_message": getattr(novo_projeto, 'inspection_message', None),
        "inspection_reply": getattr(novo_projeto, 'inspection_reply', None),
        "comments_count": 0,
        "comentarios": []
    }

@app.post("/projects/{project_id}/inspect")
@app.patch("/projects/{project_id}/inspect")
async def inspecionar_projeto(
    project_id: int,
    payload: InspectionRequest | dict = None,
    db: AsyncSession = Depends(database.get_db),
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    result = await db.execute(
        select(models.ProjectModel)
        .options(selectinload(models.ProjectModel.comentarios))
        .where(models.ProjectModel.id == project_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    novo_status = "Sob Inspeção (Aguardando Correção)"
    if payload:
        if isinstance(payload, dict):
            novo_status = payload.get("status", "Sob Inspeção (Aguardando Correção)")
            p.inspection_reason = payload.get("reason", p.inspection_reason)
            p.inspection_message = payload.get("report_message", p.inspection_message)
        elif hasattr(payload, "status") and payload.status:
            novo_status = payload.status
            if hasattr(payload, "reason") and payload.reason:
                p.inspection_reason = payload.reason
            if hasattr(payload, "report_message") and payload.report_message:
                p.inspection_message = payload.report_message

    p.status = novo_status
    db.add(p)
    await db.commit()
    await db.refresh(p)

    p_tags = [t.strip() for t in p.tags.split(",") if t.strip()] if p.tags else []
    comentarios_formatados = [{"id": c.id, "project_id": c.project_id, "autor": c.autor, "autor_arroba": c.autor_arroba, "conteudo": c.conteudo} for c in p.comentarios]

    return {
        "id": p.id,
        "title": p.title,
        "studio": p.studio,
        "description": p.description,
        "progress": p.progress,
        "tags": p_tags,
        "likes": p.likes,
        "favorito": p.favorito,
        "executavel_navegador": p.executavel_navegador,
        "build_path": p.build_path,
        "poster_path": p.poster_path,
        "owner": p.owner,
        "user_id": p.user_id,
        "campaign_id": getattr(p, 'campaign_id', None),
        "members": getattr(p, 'members', ""),
        "status": p.status,
        "inspection_reason": p.inspection_reason,
        "inspection_message": p.inspection_message,
        "inspection_reply": p.inspection_reply,
        "comments_count": len(comentarios_formatados),
        "comentarios": comentarios_formatados
    }

@app.delete("/projects/{project_id}")
async def excluir_projeto(
    project_id: int,
    db: AsyncSession = Depends(database.get_db),
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    result = await db.execute(select(models.ProjectModel).where(models.ProjectModel.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    dono = (p.owner or p.user_id or "").strip().lower()
    atual = (utilizador_email or "").strip().lower()
    
    if atual != "admin" and dono != "" and dono != atual:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Não tem permissão para excluir este projeto."
        )

    await db.delete(p)
    await db.commit()
    return {"message": "Projeto excluído com sucesso!"}

@app.patch("/projects/{project_id}/avaliar", response_model=schemas.ProjectResponse)
async def avaliar_projeto_estrela(project_id: int, db: AsyncSession = Depends(database.get_db), utilizador_email: str = Depends(obter_utilizador_atual)):
    result = await db.execute(
        select(models.ProjectModel)
        .options(selectinload(models.ProjectModel.comentarios))
        .where(models.ProjectModel.id == project_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    p.likes += 1
    await db.commit()
    await db.refresh(p)
    
    p_tags = [t.strip() for t in p.tags.split(",") if t.strip()] if p.tags else []
    comentarios_formatados = [{"id": c.id, "project_id": c.project_id, "autor": c.autor, "autor_arroba": c.autor_arroba, "conteudo": c.conteudo} for c in p.comentarios]
    
    return {
        "id": p.id,
        "title": p.title,
        "studio": p.studio,
        "description": p.description,
        "progress": p.progress,
        "tags": p_tags,
        "likes": p.likes,
        "favorito": p.favorito,
        "executavel_navegador": p.executavel_navegador,
        "build_path": p.build_path,
        "poster_path": p.poster_path,
        "owner": p.owner,
        "user_id": p.user_id,
        "campaign_id": getattr(p, 'campaign_id', None),
        "members": getattr(p, 'members', ""),
        "status": getattr(p, 'status', 'Ativo'),
        "inspection_reason": getattr(p, 'inspection_reason', None),
        "inspection_message": getattr(p, 'inspection_message', None),
        "inspection_reply": getattr(p, 'inspection_reply', None),
        "comments_count": len(comentarios_formatados),
        "comentarios": comentarios_formatados
    }

@app.get("/projects/{project_id}", response_model=schemas.ProjectResponse)
async def obter_projeto(project_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(
        select(models.ProjectModel)
        .options(selectinload(models.ProjectModel.comentarios))
        .where(models.ProjectModel.id == project_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    p_tags = [t.strip() for t in p.tags.split(",") if t.strip()] if p.tags else []
    comentarios_formatados = [{"id": c.id, "project_id": c.project_id, "autor": c.autor, "autor_arroba": c.autor_arroba, "conteudo": c.conteudo} for c in p.comentarios]
    
    return {
        "id": p.id,
        "title": p.title,
        "studio": p.studio,
        "description": p.description,
        "progress": p.progress,
        "tags": p_tags,
        "likes": p.likes,
        "favorito": p.favorito,
        "executavel_navegador": p.executavel_navegador,
        "build_path": p.build_path,
        "poster_path": p.poster_path,
        "owner": p.owner,
        "user_id": p.user_id,
        "campaign_id": getattr(p, 'campaign_id', None),
        "members": getattr(p, 'members', ""),
        "status": getattr(p, 'status', 'Ativo'),
        "inspection_reason": getattr(p, 'inspection_reason', None),
        "inspection_message": getattr(p, 'inspection_message', None),
        "inspection_reply": getattr(p, 'inspection_reply', None),
        "comments_count": len(comentarios_formatados),
        "comentarios": comentarios_formatados
    }

@app.post("/projects/{project_id}/comentarios", response_model=schemas.ComentarioProjetoResponse, status_code=status.HTTP_201_CREATED)
async def adicionar_comentario_projeto(project_id: int, comentario: schemas.ComentarioProjetoCreate, db: AsyncSession = Depends(database.get_db), utilizador_email: str = Depends(obter_utilizador_atual)):
    result = await db.execute(
        select(models.ProjectModel)
        .options(selectinload(models.ProjectModel.comentarios))
        .where(models.ProjectModel.id == project_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    novo_comentario = models.ProjectCommentModel(
        project_id=project_id,
        autor=utilizador_email.split('@')[0],
        autor_arroba=f"@{utilizador_email.split('@')[0]}",
        conteudo=comentario.conteudo
    )
    db.add(novo_comentario)
    await db.commit()
    await db.refresh(novo_comentario)

    if p.owner and p.owner != utilizador_email:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8002/notifications",
                    params={
                        "destinatario_email": p.owner,
                        "conteudo": f"{utilizador_email.split('@')[0]} comentou no seu projeto '{p.title}'",
                        "link_destino": "/frontend/home.html"
                    }
                )
        except Exception as e:
            print(f"Erro ao enviar notificação automática: {e}")

    return novo_comentario

@app.get("/campaigns/featured", response_model=schemas.CampaignResponse)
def obter_campanha_destaque(db: AsyncSession = Depends(database.get_db)):
    return {
        "id": 1,
        "title": "Folclore Reimaginado",
        "subtitle": "Crie uma experiência inspirada nas histórias da sua região. Monte uma equipe, publique seu progresso e concorra a mentoria com estúdios independentes.",
        "projects_count": 488,
        "participants_count": 1920
    }

@app.get("/communities", response_model=list[schemas.CommunityResponse])
def listar_comunidades(db: AsyncSession = Depends(database.get_db)):
    return [
        {"id": 1, "name": "Dev Indie Brasil", "members_count": "12,8 mil membros"},
        {"id": 2, "name": "Godot em Português", "members_count": "8,2 mil membros"},
        {"id": 3, "name": "Women Who Make Games", "members_count": "4,7 mil membros"}
    ]

@app.put("/projects/{project_id}", response_model=schemas.ProjectResponse)
@app.put("/projects/{project_id}/", response_model=schemas.ProjectResponse)
async def atualizar_projeto(
    project_id: int,
    projeto_dados: schemas.ProjectUpdate,
    db: AsyncSession = Depends(database.get_db),
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    result = await db.execute(
        select(models.ProjectModel)
        .options(selectinload(models.ProjectModel.comentarios))
        .where(models.ProjectModel.id == project_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    
    dono = (p.owner or p.user_id or "").strip().lower()
    atual = (utilizador_email or "").strip().lower()
    
    if atual != "admin" and dono != "" and dono != atual:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Não tem permissão para editar este projeto."
        )

    if projeto_dados.title is not None:
        p.title = projeto_dados.title
    if projeto_dados.description is not None:
        p.description = projeto_dados.description
    if projeto_dados.progress is not None:
        p.progress = projeto_dados.progress
    if projeto_dados.tags is not None:
        p.tags = projeto_dados.tags
    if projeto_dados.campaign_id is not None:
        p.campaign_id = projeto_dados.campaign_id
    if projeto_dados.members is not None:
        p.members = projeto_dados.members
    
    if hasattr(projeto_dados, 'inspection_reply') and projeto_dados.inspection_reply is not None:
        p.inspection_reply = projeto_dados.inspection_reply
        p.status = "Sob Inspeção (Aguardando Revisão do Admin)"
    
    await db.commit()
    await db.refresh(p)
    
    p_tags = [t.strip() for t in p.tags.split(",") if t.strip()] if p.tags else []
    comentarios_formatados = [{"id": c.id, "project_id": c.project_id, "autor": c.autor, "autor_arroba": c.autor_arroba, "conteudo": c.conteudo} for c in p.comentarios]
    
    return {
        "id": p.id,
        "title": p.title,
        "studio": p.studio,
        "description": p.description,
        "progress": p.progress,
        "tags": p_tags,
        "likes": p.likes,
        "favorito": p.favorito,
        "executavel_navegador": p.executavel_navegador,
        "build_path": p.build_path,
        "poster_path": p.poster_path,
        "campaign_id": getattr(p, 'campaign_id', None),
        "members": getattr(p, 'members', ""),
        "owner": p.owner,
        "user_id": p.user_id,
        "status": getattr(p, 'status', 'Ativo'),
        "inspection_reason": getattr(p, 'inspection_reason', None),
        "inspection_message": getattr(p, 'inspection_message', None),
        "inspection_reply": getattr(p, 'inspection_reply', None),
        "comments_count": len(comentarios_formatados),
        "comentarios": comentarios_formatados
    }

@app.post("/projects/{project_id}/testar")
async def testar_projeto(
    project_id: int, 
    authorization: str = Header(None),
):
    if authorization:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8005/perfil/adicionar-xp",
                    json={"xp": 75},
                    headers={"Authorization": authorization}
                )
        except Exception as e:
            print(f"Erro ao creditar XP pelo teste do jogo: {e}")

    return {"mensagem": "Teste registado com sucesso e +75 XP adicionados ao seu perfil!"}

@app.patch("/projects/{project_id}/favorito", response_model=schemas.ProjectResponse)
async def alternar_favorito(project_id: int, db: AsyncSession = Depends(database.get_db), utilizador_email: str = Depends(obter_utilizador_atual)):
    result = await db.execute(
        select(models.ProjectModel)
        .options(selectinload(models.ProjectModel.comentarios))
        .where(models.ProjectModel.id == project_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    p.favorito = 0 if p.favorito == 1 else 1
    await db.commit()
    await db.refresh(p)
    
    p_tags = [t.strip() for t in p.tags.split(",") if t.strip()] if p.tags else []
    comentarios_formatados = [{"id": c.id, "project_id": c.project_id, "autor": c.autor, "autor_arroba": c.autor_arroba, "conteudo": c.conteudo} for c in p.comentarios]
    
    return {
        "id": p.id,
        "title": p.title,
        "studio": p.studio,
        "description": p.description,
        "progress": p.progress,
        "tags": p_tags,
        "likes": p.likes,
        "favorito": p.favorito,
        "executavel_navegador": p.executavel_navegador,
        "build_path": p.build_path,
        "poster_path": p.poster_path,
        "campaign_id": getattr(p, 'campaign_id', None),
        "members": getattr(p, 'members', ""),
        "owner": p.owner,
        "user_id": p.user_id,
        "status": getattr(p, 'status', 'Ativo'),
        "inspection_reason": getattr(p, 'inspection_reason', None),
        "inspection_message": getattr(p, 'inspection_message', None),
        "inspection_reply": getattr(p, 'inspection_reply', None),
        "comments_count": len(comentarios_formatados),
        "comentarios": comentarios_formatados
    }

@app.post("/projects/{project_id}/aprovar")
@app.patch("/projects/{project_id}/aprovar")
async def aprovar_projeto(
    project_id: int,
    db: AsyncSession = Depends(database.get_db),
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    result = await db.execute(select(models.ProjectModel).where(models.ProjectModel.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    
    p.status = "Ativo"
    p.inspection_reason = None
    p.inspection_message = None
    await db.commit()
    await db.refresh(p)
    return {"message": "Projeto aprovado e reativado com sucesso!", "status": p.status}

@app.post("/projects/{project_id}/reprovar")
@app.patch("/projects/{project_id}/reprovar")
async def reprovar_projeto(
    project_id: int,
    payload: InspectionRequest = None,
    db: AsyncSession = Depends(database.get_db),
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    result = await db.execute(select(models.ProjectModel).where(models.ProjectModel.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    
    p.status = "Sob Inspeção (Correção Reprovada - Nova Revisão)"
    if payload and payload.report_message:
        p.inspection_message = payload.report_message
    await db.commit()
    await db.refresh(p)
    return {"message": "Correção reprovada.", "status": p.status}    

@app.post("/projects/{project_id}/reply-inspection")
async def reply_inspection(
    project_id: int,
    payload: InspectionReplyRequest,
    db: AsyncSession = Depends(database.get_db),
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    result = await db.execute(select(models.ProjectModel).where(models.ProjectModel.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    
    p.inspection_reply = payload.reply_message
    p.status = "Sob Inspeção (Aguardando Revisão do Admin)"
    await db.commit()
    await db.refresh(p)
    return {"message": "Devolução de correção enviada com sucesso!", "status": p.status}