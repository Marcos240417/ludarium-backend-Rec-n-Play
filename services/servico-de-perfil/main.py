from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import models, database, schemas

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
    utilizador_email: str = Depends(obter_utilizador_atual)
):
    perfil = db.query(models.PerfilModel).filter(models.PerfilModel.utilizador_email == utilizador_email).first()
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    db.delete(perfil)
    db.commit()
    return None        

@app.get("/perfil/eu", response_model=schemas.PerfilCompletoResponse)
def obter_perfil_completo(db: Session = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    perfil = db.query(models.PerfilModel).filter(models.PerfilModel.utilizador_email == utilizador_email).first()
    
    if not perfil:
        perfil = models.PerfilModel(
            utilizador_email=utilizador_email,
            nome="Lia Monteiro",
            arroba="@liamakesgames",
            localizacao="São Paulo, Brasil",
            biografia="Game designer, artista de pixels e colecionadora de ideias inacabadas. Criando pequenos mundos acolhedores na Godot.",
            badge_funcao="FUNDADORA",
            nivel=24,
            xp_atual=11400,
            xp_proximo_nivel=15000,
            seguidores_qtd=284,
            seguindo_qtd=96,
            projetos_qtd=6,
            contribuicoes_anuais=1248
        )
        db.add(perfil)
        db.commit()
        db.refresh(perfil)
        
        db.add(models.PerfilLinkModel(perfil_id=perfil.id, rotulo="github.com/liamakes", url="https://github.com/liamakes"))
        db.add(models.PerfilLinkModel(perfil_id=perfil.id, rotulo="/in/liamonteiro", url="https://linkedin.com/in/liamonteiro"))
        db.add(models.PerfilLinkModel(perfil_id=perfil.id, rotulo="lsmaker.games", url="https://lsmaker.games"))
        
        db.add(models.PerfilComunidadeModel(perfil_id=perfil.id, nome="Dev Indie Brasil", membros="12,8 mil membros"))
        db.add(models.PerfilComunidadeModel(perfil_id=perfil.id, nome="Godot em Português", membros="8,2 mil membros"))
        db.add(models.PerfilComunidadeModel(perfil_id=perfil.id, nome="Pixel Art Club", membros="5,1 mil membros"))
        db.add(models.PerfilComunidadeModel(perfil_id=perfil.id, nome="Women Who Make Games", membros="4,7 mil membros"))
        
        db.add(models.PerfilProjetoModel(perfil_id=perfil.id, titulo="Mossvale", papel="Criadora - Game Designer", progresso=75, status_badge="DEMO DISPONÍVEL", likes=1800))
        db.add(models.PerfilProjetoModel(perfil_id=perfil.id, titulo="Tiny Alchemist", papel="Solo project • Pixel Art", progresso=45, status_badge="EM PRODUÇÃO", likes=842))
        db.add(models.PerfilProjetoModel(perfil_id=perfil.id, titulo="Sunset Courier", papel="Programadora", progresso=100, status_badge="CONCLUÍDO", likes=389))
        
        db.add(models.PerfilAtividadeModel(
            perfil_id=perfil.id,
            descricao="Lia Monteiro publicou uma nova atualização em Mossvale: 'A floresta finalmente ganhou vida'",
            tempo_atras="Hoje, 10:42 • Devlog, 45k",
            likes=128,
            comentarios_qtd=24,
            comentario_destaque="A iluminação ficou incrível! O reflexo no lago dá outra dimensão para a cena."
        ))
        
        db.add(models.PerfilTrofeuModel(perfil_id=perfil.id, titulo="Guardião de Histórias", descricao="Conclua a campanha Folclore Reimaginado.", concluido=False))
        db.add(models.PerfilTrofeuModel(perfil_id=perfil.id, titulo="Primeiro lançamento", descricao="Publicou um projeto jogável.", concluido=True))
        db.add(models.PerfilTrofeuModel(perfil_id=perfil.id, titulo="Favorito da semana", descricao="Projeto em destaque no Ludarium.", concluido=True))
        db.add(models.PerfilTrofeuModel(perfil_id=perfil.id, titulo="Feedback valioso", descricao="100 comentários úteis.", concluido=True))
        
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