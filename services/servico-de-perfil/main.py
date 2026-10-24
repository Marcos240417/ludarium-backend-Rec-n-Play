import os
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import models, database, schemas
import httpx

SECRET_KEY = "ludarium_super_secret_key_jwt"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8080/login")

# Cria as tabelas na base de dados utilizando o metadata unificado
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Serviço de Perfil - Ludarium", version="1.0.0")

app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

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
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return email
    except JWTError:
        raise credentials_exception

@app.put("/perfil/eu", response_model=schemas.PerfilCompletoResponse)
def atualizar_perfil(
    dados: schemas.PerfilUpdate, 
    db: Session = Depends(database.obter_base_de_dados), 
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    perfil = db.query(models.PerfilModel).filter(models.PerfilModel.utilizador_email == utilizador_email).first()

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
        db.query(models.PerfilLinkModel).filter(models.PerfilLinkModel.perfil_id == perfil.id).delete()
        for l in dados.links:
            novo_link = models.PerfilLinkModel(perfil_id=perfil.id, rotulo=l.rotulo, url=l.url)
            db.add(novo_link)

    db.commit()
    db.refresh(perfil)
    return perfil

@app.delete("/perfil/eu", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_perfil(
    db: Session = Depends(database.obter_base_de_dados), 
    utilizador_email: str = Depends(obter_utilizador_atual),
    authorization: str = Header(None) # Para reencaminhar o token se necessário
):
    perfil = db.query(models.PerfilModel).filter(models.PerfilModel.utilizador_email == utilizador_email).first()
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    # 1. Apaga primeiro todos os registos dependentes do perfil
    db.query(models.PerfilLinkModel).filter(models.PerfilLinkModel.perfil_id == perfil.id).delete()
    db.query(models.PerfilComunidadeModel).filter(models.PerfilComunidadeModel.perfil_id == perfil.id).delete()
    db.query(models.PerfilProjetoModel).filter(models.PerfilProjetoModel.perfil_id == perfil.id).delete()
    db.query(models.PerfilAtividadeModel).filter(models.PerfilAtividadeModel.perfil_id == perfil.id).delete()
    db.query(models.PerfilTrofeuModel).filter(models.PerfilTrofeuModel.perfil_id == perfil.id).delete()
    
    # 2. Apaga o perfil principal
    db.delete(perfil)
    db.commit()

    # 3. Notifica o Serviço de Autenticação (porta 8001) para apagar o utilizador/credenciais
    try:
        auth_service_url = "http://localhost:8001" 
        headers = {"Authorization": authorization} if authorization else {}
        with httpx.Client() as client:
            client.delete(f"{auth_service_url}/users/me", headers=headers)
    except Exception as e:
        print(f"Erro ao comunicar com o serviço de autenticação para apagar o utilizador: {e}")

    return None      

@app.get("/perfil/eu", response_model=schemas.PerfilCompletoResponse)
def obter_perfil_completo(db: Session = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    perfil = db.query(models.PerfilModel).filter(models.PerfilModel.utilizador_email == utilizador_email).first()
    
    if not perfil:
        nome_base = utilizador_email.split('@')[0] if utilizador_email else "utilizador"
        
        perfil = models.PerfilModel(
            utilizador_email=utilizador_email,
            nome="",                    
            arroba=f"@{nome_base}",     
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
        db.commit()
        db.refresh(perfil)

    return perfil

@app.post("/perfil/adicionar-xp")
def adicionar_xp(
    dados: dict, 
    db: Session = Depends(database.obter_base_de_dados), 
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    quantidade = dados.get("xp", 0)
    
    perfil = db.query(models.PerfilModel).filter(models.PerfilModel.utilizador_email == utilizador_email).first()
    
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado para este utilizador.")
    
    perfil.xp_atual += quantidade
    
    while perfil.xp_atual >= perfil.xp_proximo_nivel:
        perfil.xp_atual -= perfil.xp_proximo_nivel
        perfil.nivel += 1
        perfil.xp_proximo_nivel = int(perfil.xp_proximo_nivel * 1.2)
        
    db.commit()
    db.refresh(perfil)
    
    return {
        "mensagem": f"+{quantidade} XP adicionados com sucesso!",
        "nivel": perfil.nivel,
        "xp_atual": perfil.xp_atual,
        "xp_proximo_nivel": perfil.xp_proximo_nivel
    }    

@app.get("/perfil/leaderboard")
async def obter_leaderboard(db: Session = Depends(database.obter_base_de_dados)):
    perfis = db.query(models.PerfilModel).order_by(models.PerfilModel.xp_atual.desc()).limit(10).all()
    
    ranking = []
    for p in perfis:
        ranking.append({
            "nome": p.nome,
            "arroba": p.arroba,
            "nivel": p.nivel,
            "xp_atual": p.xp_atual
        })
    return ranking

def atualizar_trofeus_automaticos(perfil, db):
    """Verifica e atualiza o estado dos troféus com base no progresso atual do utilizador."""
    regras_trofeus = {
        "Primeiro Passo": True,
        "Crítico de Jogos": perfil.xp_atual >= 75,
        "Mestre do Nível 5": perfil.nivel >= 5,
        "Explorador Global": perfil.nivel >= 10
    }

    trofeus_db = db.query(models.PerfilTrofeuModel).filter(models.PerfilTrofeuModel.perfil_id == perfil.id).all()
    
    for t in trofeus_db:
        if t.titulo in regras_trofeus:
            if regras_trofeus[t.titulo] and not t.concluido:
                t.concluido = True
                
    db.commit()

@app.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_utilizador_auth(
    db: Session = Depends(database.obter_base_de_dados), 
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    # Procura e remove o utilizador da base de dados de autenticação pelo email do token
    utilizador = db.query(models.UserModel).filter(models.UserModel.email == utilizador_email).first()
    
    if utilizador:
        db.delete(utilizador)
        db.commit()
        
    return None    