from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import models, database, schemas

SECRET_KEY = "ludarium_super_secret_key_jwt"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8080/login")

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Serviço de Perfil - Ludarium", version="1.0.0")

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

@app.get("/perfil/eu", response_model=schemas.PerfilCompletoResponse)
def obter_perfil_completo(db: Session = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    perfil = db.query(models.PerfilModel).filter(models.PerfilModel.utilizador_email == utilizador_email).first()
    
    if not perfil:
        # Povoamento inicial exatamente igual à página de perfil da criadora
        perfil = models.PerfilModel(
            utilizador_email=utilizador_email,
            nome="Lia Monteiro",
            arroba="@liamakesgames - São Paulo, Brasil",
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
        
        # Links
        db.add(models.PerfilLinkModel(perfil_id=perfil.id, rotulo="github.com/liamakes", url="https://github.com/liamakes"))
        db.add(models.PerfilLinkModel(perfil_id=perfil.id, rotulo="/in/liamonteiro", url="https://linkedin.com/in/liamonteiro"))
        db.add(models.PerfilLinkModel(perfil_id=perfil.id, rotulo="lsmaker.games", url="https://lsmaker.games"))
        
        # Comunidades
        db.add(models.PerfilComunidadeModel(perfil_id=perfil.id, nome="Dev Indie Brasil", membros="12,8 mil membros"))
        db.add(models.PerfilComunidadeModel(perfil_id=perfil.id, nome="Godot em Português", membros="8,2 mil membros"))
        db.add(models.PerfilComunidadeModel(perfil_id=perfil.id, nome="Pixel Art Club", membros="5,1 mil membros"))
        db.add(models.PerfilComunidadeModel(perfil_id=perfil.id, nome="Women Who Make Games", membros="4,7 mil membros"))
        
        # Projetos em destaque
        db.add(models.PerfilProjetoModel(perfil_id=perfil.id, titulo="Mossvale", papel="Criadora • Game Designer", progresso=75, status_badge="DEMO DISPONÍVEL", likes=1800))
        db.add(models.PerfilProjetoModel(perfil_id=perfil.id, titulo="Tiny Alchemist", papel="Solo project • Pixel Art", progresso=45, status_badge="EM PRODUÇÃO", likes=842))
        db.add(models.PerfilProjetoModel(perfil_id=perfil.id, titulo="Sunset Courier", papel="Programadora", progresso=100, status_badge="CONCLUÍDO", likes=389))
        
        # Atividade recente (Diário Público)
        db.add(models.PerfilAtividadeModel(
            perfil_id=perfil.id, 
            descricao="Lia Monteiro publicou uma nova atualização em Mossvale: 'A floresta finalmente ganhou vida'", 
            tempo_atras="Hoje, 10:42 • Devlog, 45k", 
            likes=128, 
            comentarios_qtd=24,
            comentario_destaque="A iluminação ficou incrível! O reflexo no lago dá outra dimensão para a cena."
        ))
        
        # Troféus (Sala de Troféus)
        db.add(models.PerfilTrofeuModel(perfil_id=perfil.id, titulo="Guardião de Histórias", descricao="Conclua a campanha Folclore Reimaginado.", concluido=False))
        db.add(models.PerfilTrofeuModel(perfil_id=perfil.id, titulo="Primeiro lançamento", descricao="Publicou um projeto jogável.", concluido=True))
        db.add(models.PerfilTrofeuModel(perfil_id=perfil.id, titulo="Favorito da semana", descricao="Projeto em destaque no Ludarium.", concluido=True))
        db.add(models.PerfilTrofeuModel(perfil_id=perfil.id, titulo="Feedback valioso", descricao="100 comentários úteis.", concluido=True))
        
        db.commit()
        db.refresh(perfil)
        
    return perfil