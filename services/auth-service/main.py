from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import bcrypt
from datetime import datetime, timedelta
from jose import JWTError, jwt
import models, database, schemas

SECRET_KEY = "ludarium_super_secret_key_jwt"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Ludarium Auth Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def criar_token_acesso(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def obter_utilizador_atual(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/")
def raiz():
    return {"message": "Auth Service a funcionar corretamente!"}

@app.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def registar_utilizador(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter((models.User.username == user.username) | (models.User.email == user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Nome de utilizador ou email já existente.")

    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    novo_utilizador = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    
    db.add(novo_utilizador)
    db.commit()
    db.refresh(novo_utilizador)
    return novo_utilizador

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter((models.User.username == form_data.username) | (models.User.email == form_data.username)).first()
    if not user or not bcrypt.checkpw(form_data.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=400, detail="Utilizador ou senha incorretos.")

    access_token = criar_token_acesso(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", response_model=schemas.UserResponse)
def obter_perfil_atual(current_user: models.User = Depends(obter_utilizador_atual)):
    return current_user

@app.get("/users/search")
def pesquisar_utilizador(
    username: str | None = None,
    email: str | None = None,
    db: Session = Depends(database.get_db),
    utilizador_atual: models.User = Depends(obter_utilizador_atual)
):
    if username:
        user = db.query(models.User).filter(models.User.username == username).first()
    elif email:
        user = db.query(models.User).filter(models.User.email == email).first()
    else:
        raise HTTPException(status_code=400, detail="Forneça um username ou email para pesquisar.")
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }

@app.get("/messages/my-messages")
def listar_mensagens_utilizador(current_user: models.User = Depends(obter_utilizador_atual), db: Session = Depends(database.get_db)):
    try:
        mensagens = db.query(models.PrivateMessage).filter(models.PrivateMessage.recipient_username == current_user.username).all()
        return mensagens
    except Exception:
        return []

@app.post("/messages/send-admin-message")
def enviar_mensagem_admin(
    recipient_username: str, 
    content: str, 
    current_user: models.User = Depends(obter_utilizador_atual), 
    db: Session = Depends(database.get_db)
):
    # Removido o bloqueio restrito de admin para permitir o envio por utilizadores comuns
    destinatario = db.query(models.User).filter(models.User.username == recipient_username).first()
    if not destinatario:
        raise HTTPException(status_code=404, detail="Destinatário não encontrado.")

    try:
        nova_msg = models.PrivateMessage(
            sender_username=current_user.username,
            recipient_username=recipient_username,
            content=content
        )
        db.add(nova_msg)
        db.commit()
        return {"message": "Mensagem privada enviada com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar mensagem: {str(e)}")

@app.delete("/messages/{message_id}")
def apagar_mensagem_privada(
    message_id: int, 
    current_user: models.User = Depends(obter_utilizador_atual), 
    db: Session = Depends(database.get_db)
):
    msg = db.query(models.PrivateMessage).filter(
        models.PrivateMessage.id == message_id, 
        models.PrivateMessage.recipient_username == current_user.username
    ).first()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada.")
    
    db.delete(msg)
    db.commit()
    return {"message": "Mensagem excluída com sucesso!"}




Não precisa ativar o venv para cada serviço se você já estiver em um ambiente virtual global, mas é altamente recomendado ativar o venv específico de cada serviço para evitar conflitos de dependências.
Se o venv já estiver ativo precsa apenas rodar (uvicorn main:app --reload --port) com a porta correta para cada serviço.
Se o seu objetivo é iniciar todos os microserviços do projeto "Ludarium" de forma eficiente, siga as instruções abaixo para cada serviço. Certifique-se de que cada serviço está a ser executado em um terminal separado para evitar conflitos de porta e garantir que todos os serviços possam comunicar entre si corretamente.

Estes são os diretórios e microserviços essenciais que compõem a arquitetura do seu projeto "Ludarium". Para garantir que todos os serviços fiquem ativos e a comunicar corretamente em simultâneo, pode abrir um terminal separado para cada um deles no seu PowerShell e executar os respetivos comandos de inicialização:

1. Serviço de Autenticação (`auth-service` na porta 8001)
cd "C:\Users\LENOVO\OneDrive\Área de Trabalho\ludarium-backend\services\auth-service"
.\venv\Scripts\activate
uvicorn main:app --reload --port 8001

2. Serviço de Projetos (`project-service` na porta 8081)
cd "C:\Users\LENOVO\OneDrive\Área de Trabalho\ludarium-backend\services\project-service"
.\venv\Scripts\activate
uvicorn main:app --reload --port 8081

3. Serviço de Gateway (`servico-de-gateway` na porta 8000)
cd "C:\Users\LENOVO\OneDrive\Área de Trabalho\ludarium-backend\services\servico-de-gateway"
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000

4. Serviço de Campanhas (`servico-de-campanhas` na porta 8082)
cd "C:\Users\LENOVO\OneDrive\Área de Trabalho\ludarium-backend\services\servico-de-campanhas"
.\venv\Scripts\activate
uvicorn main:app --reload --port 8082


5. Serviço de Comunidade (`servico-de-comunidade` na porta 8083)
cd "C:\Users\LENOVO\OneDrive\Área de Trabalho\ludarium-backend\services\servico-de-comunidade"
.\venv\Scripts\activate
uvicorn main:app --reload --port 8083


6. Serviço de Perfil (`servico-de-perfil` na porta 8084)
cd "C:\Users\LENOVO\OneDrive\Área de Trabalho\ludarium-backend\services\servico-de-perfil"
.\venv\Scripts\activate
uvicorn main:app --reload --port 8084
