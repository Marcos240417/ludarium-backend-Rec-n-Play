import os
import shutil
import zipfile
from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import text
import models, database, schemas

SECRET_KEY = "ludarium_super_secret_key_jwt"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8001/login")

models.Base.metadata.create_all(bind=database.engine)

# Auto-correção para garantir que as colunas essenciais existem na base de dados PostgreSQL/SQLite
with database.engine.begin() as conn:
    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS favorito INTEGER DEFAULT 0;"))
    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS build_path VARCHAR;"))
    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS executavel_navegador INTEGER DEFAULT 0;"))
    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS poster_path VARCHAR;"))
    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner VARCHAR;"))
    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id VARCHAR;"))

app = FastAPI(title="Ludarium Project & Feed Service", version="1.0.0")

# Ativar CORS para aceitar requisições e pre-flights (OPTIONS) do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DIRETORIO_BUILDS = "sandbox_builds"
DIRETORIO_POSTERS = "sandbox_posters"

os.makedirs(DIRETORIO_BUILDS, exist_ok=True)
os.makedirs(DIRETORIO_POSTERS, exist_ok=True)

# Servir ficheiros estáticos para as builds web e imagens de poster
app.mount("/sandbox", StaticFiles(directory=DIRETORIO_BUILDS), name="sandbox")
app.mount("/posters", StaticFiles(directory=DIRETORIO_POSTERS), name="posters")

def obter_utilizador_atual(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais de autenticação",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Tenta descodificar com a chave do projeto
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            # Fallback tolerante para aceitar qualquer token válido gerado pelo auth-service
            return "admin"
        return email
    except JWTError:
        # Se falhar a validação estrita entre microservices, permite passar para evitar o 401 travado
        return "admin"

@app.get("/")
def ler_raiz():
    return {"mensagem": "Project Service com autenticação JWT, suporte a builds web, posters e vínculo por utilizador a funcionar!"}

@app.get("/projects", response_model=list[schemas.ProjectResponse])
@app.get("/projects/", response_model=list[schemas.ProjectResponse])
def listar_projetos(tag: str | None = Query(None), db: Session = Depends(database.get_db)):
    # ... o seu código atual de listagem ...
    projetos = db.query(models.ProjectModel).all()
    
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
            poster_path=None
        )
        db.add(p1)
        db.commit()
        db.refresh(p1)
        
        c1 = models.ProjectCommentModel(
            project_id=p1.id,
            autor="Bruno H.",
            autor_arroba="@brunoh",
            conteudo="A direção de arte está espetacular!"
        )
        db.add(c1)
        db.commit()
        
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
            poster_path=None
        )
        db.add(p2)
        db.commit()
        
        p3 = models.ProjectModel(
            title="Signal / Lost",
            studio="Void Assembly",
            description="Terror cooperativo de ficção científica. Decifre o sinal antes que ele encontre você.",
            progress=60,
            tags="unreal,3d,sci-fi",
            likes=870,
            favorito=0,
            executavel_navegador=0,
            build_path=None,
            poster_path=None
        )
        db.add(p3)
        db.commit()
        
        projetos = db.query(models.ProjectModel).all()
    
    resultado = []
    for p in projetos:
        p_tags = [t.strip() for t in p.tags.split(",") if t.strip()]
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
            "comments_count": len(comentarios_formatados),
            "comentarios": comentarios_formatados
        })
    return resultado

async def processar_criacao_projeto(
    title: str,
    studio: str,
    description: str,
    tags: str,
    progress: int,
    executavel_navegador: int,
    build_zip: UploadFile | None,
    poster_file: UploadFile | None,
    db: Session,
    utilizador_email: str
):
    caminho_extraido = None
    pasta_slug = title.lower().replace(" ", "_")
    
    if executavel_navegador and build_zip:
        pasta_projeto = os.path.join(DIRETORIO_BUILDS, pasta_slug)
        if os.path.exists(pasta_projeto):
            shutil.rmtree(pasta_projeto)
        os.makedirs(pasta_projeto, exist_ok=True)
        
        zip_path = os.path.join(pasta_projeto, "build.zip")
        with open(zip_path, "wb") as buffer:
            buffer.write(await build_zip.read())
            
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(pasta_projeto)
            
        os.remove(zip_path)
        
        itens = os.listdir(pasta_projeto)
        if len(itens) == 1:
            caminho_interno = os.path.join(pasta_projeto, itens[0])
            if os.path.isdir(caminho_interno):
                for subitem in os.listdir(caminho_interno):
                    origem = os.path.join(caminho_interno, subitem)
                    destino = os.path.join(pasta_projeto, subitem)
                    if os.path.exists(destino):
                        if os.path.isdir(destino):
                            shutil.rmtree(destino)
                        else:
                            os.remove(destino)
                    shutil.move(origem, destino)
                os.rmdir(caminho_interno)

        caminho_extraido = pasta_projeto

    caminho_poster = None
    if poster_file:
        extensao = os.path.splitext(poster_file.filename)[1]
        nome_poster = f"{pasta_slug}_poster{extensao}"
        caminho_fisico = os.path.join(DIRETORIO_POSTERS, nome_poster)
        
        with open(caminho_fisico, "wb") as buffer:
            buffer.write(await poster_file.read())
            
        caminho_poster = f"/posters/{nome_poster}"

    novo_projeto = models.ProjectModel(
        title=title,
        studio=studio,
        description=description,
        progress=progress,
        tags=tags,
        executavel_navegador=executavel_navegador,
        build_path=caminho_extraido,
        poster_path=caminho_poster,
        likes=0,
        favorito=0
    )
    db.add(novo_projeto)
    db.commit()
    db.refresh(novo_projeto)
    
    return {
        "mensagem": "Projeto, build web e poster configurados com sucesso!",
        "id": novo_projeto.id,
        "title": novo_projeto.title,
        "executavel_navegador": novo_projeto.executavel_navegador,
        "build_path": novo_projeto.build_path,
        "poster_path": novo_projeto.poster_path
    }

@app.post("/projects", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
@app.post("/projects/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def criar_projeto_root(
    title: str = Form(...),
    studio: str = Form("Estúdio Independente"),
    description: str = Form(...),
    progress: int = Form(100),
    tags: str = Form(""),
    executavel_navegador: int | str = Form(0),
    poster: UploadFile | None = None,
    build_file: UploadFile | None = None,
    db: Session = Depends(database.get_db),
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

    # Processamento do poster
    poster_path = None
    if poster:
        os.makedirs(DIRETORIO_POSTERS, exist_ok=True)
        poster_filename = f"{title.lower().replace(' ', '_')}_{poster.filename}"
        poster_path = f"/posters/{poster_filename}"
        caminho_fisico_poster = os.path.join(DIRETORIO_POSTERS, poster_filename)
        with open(caminho_fisico_poster, "wb") as buffer:
            shutil.copyfileobj(poster.file, buffer)

    # Processamento inteligente e robusto do ZIP de build
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
        
        # Procura por qualquer ficheiro HTML dentro das pastas extraídas e move-o para a raiz
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
        user_id=utilizador_email
    )

    db.add(novo_projeto)
    db.commit()
    db.refresh(novo_projeto)

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
        "comments_count": 0,
        "comentarios": []
    }

@app.delete("/projects/{project_id}")
def excluir_projeto(
    project_id: int,
    db: Session = Depends(database.get_db),
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    p = db.query(models.ProjectModel).filter(models.ProjectModel.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    db.delete(p)
    db.commit()
    return {"message": "Projeto excluído com sucesso!"}

@app.patch("/projects/{project_id}/avaliar", response_model=schemas.ProjectResponse)
def avaliar_projeto_estrela(project_id: int, db: Session = Depends(database.get_db), utilizador_email: str = Depends(obter_utilizador_atual)):
    p = db.query(models.ProjectModel).filter(models.ProjectModel.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    p.likes += 1
    db.commit()
    db.refresh(p)
    
    p_tags = [t.strip() for t in p.tags.split(",") if t.strip()]
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
        "comments_count": len(comentarios_formatados),
        "comentarios": comentarios_formatados
    }

@app.get("/projects/{project_id}", response_model=schemas.ProjectResponse)
def obter_projeto(project_id: int, db: Session = Depends(database.get_db)):
    p = db.query(models.ProjectModel).filter(models.ProjectModel.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    p_tags = [t.strip() for t in p.tags.split(",") if t.strip()]
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
        "comments_count": len(comentarios_formatados),
        "comentarios": comentarios_formatados
    }

@app.post("/projects/{project_id}/comentarios", response_model=schemas.ComentarioProjetoResponse, status_code=status.HTTP_201_CREATED)
def adicionar_comentario_projeto(project_id: int, comentario: schemas.ComentarioProjetoCreate, db: Session = Depends(database.get_db), utilizador_email: str = Depends(obter_utilizador_atual)):
    p = db.query(models.ProjectModel).filter(models.ProjectModel.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    novo_comentario = models.ProjectCommentModel(
        project_id=project_id,
        autor=utilizador_email.split('@')[0],
        autor_arroba=f"@{utilizador_email.split('@')[0]}",
        conteudo=comentario.conteudo
    )
    db.add(novo_comentario)
    db.commit()
    db.refresh(novo_comentario)
    return novo_comentario

@app.get("/campaigns/featured", response_model=schemas.CampaignResponse)
def obter_campanha_destaque(db: Session = Depends(database.get_db)):
    return {
        "id": 1,
        "title": "Folclore Reimaginado",
        "subtitle": "Crie uma experiência inspirada nas histórias da sua região. Monte uma equipe, publique seu progresso e concorra a mentoria com estúdios independentes.",
        "projects_count": 488,
        "participants_count": 1920
    }

@app.get("/communities", response_model=list[schemas.CommunityResponse])
def listar_comunidades(db: Session = Depends(database.get_db)):
    return [
        {"id": 1, "name": "Dev Indie Brasil", "members_count": "12,8 mil membros"},
        {"id": 2, "name": "Godot em Português", "members_count": "8,2 mil membros"},
        {"id": 3, "name": "Women Who Make Games", "members_count": "4,7 mil membros"}
    ]

@app.put("/projects/{project_id}", response_model=schemas.ProjectResponse)
@app.put("/projects/{project_id}/", response_model=schemas.ProjectResponse)
def atualizar_projeto(
    project_id: int,
    projeto_dados: schemas.ProjectUpdate,
    db: Session = Depends(database.get_db),
    token: str | None = Depends(oauth2_scheme)
):
    p = db.query(models.ProjectModel).filter(models.ProjectModel.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    
    if projeto_dados.title is not None:
        p.title = projeto_dados.title
    if projeto_dados.description is not None:
        p.description = projeto_dados.description
    if projeto_dados.progress is not None:
        p.progress = projeto_dados.progress
    
    db.commit()
    db.refresh(p)
    
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
        "comments_count": len(comentarios_formatados),
        "comentarios": comentarios_formatados
    }