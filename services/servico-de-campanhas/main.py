from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import models, database, schemas

SECRET_KEY = "ludarium_super_secret_key_jwt"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8080/login")

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Serviço de Campanhas e Desafios - Ludarium", version="1.0.0")

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

@app.get("/")
def raiz():
    return {"mensagem": "Serviço de Campanhas com autenticação JWT e vínculo por utilizador a funcionar!"}

@app.get("/progresso-usuario", response_model=schemas.UsuarioProgressoResponse)
def obter_progresso_utilizador(db: Session = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    """Retorna o progresso, nível e XP do utilizador autenticado"""
    progresso = db.query(models.UsuarioProgressoModel).first()
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
        db.commit()
        db.refresh(progresso)
    return progresso

@app.get("/campanhas", response_model=list[schemas.CampanhaResponse])
def listar_campanhas(db: Session = Depends(database.obter_base_de_dados)):
    campanhas = db.query(models.CampanhaModel).all()
    
    if not campanhas:
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
        db.commit()
        db.refresh(c1)
        
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
        db.commit()
        
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
        db.commit()
        
        campanhas = db.query(models.CampanhaModel).all()
        
    return campanhas

@app.patch("/objetivos/{objetivo_id}/concluir", response_model=schemas.ObjetivoResponse)
def alternar_conclusao_objetivo(objetivo_id: int, db: Session = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    """Alterna o estado de conclusão de uma tarefa no checklist do utilizador autenticado"""
    obj = db.query(models.ObjetivoCampanhaModel).filter(models.ObjetivoCampanhaModel.id == objetivo_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado")
    
    obj.concluido = not obj.concluido
    db.commit()
    db.refresh(obj)
    return obj