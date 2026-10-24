from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Defina a URL da base de dados SQLite (ou mantenha a que já utilizava)
DATABASE_URL = "sqlite:///./comunidade.db"

# 1. Crie o engine primeiro
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# 2. Depois crie o SessionLocal utilizando o engine criado acima
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 3. Função para obter a sessão da base de dados (get_db)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ADICIONE ESTA LINHA: Permite que tanto 'get_db' quanto 'obter_base_de_dados' funcionem perfeitamente
obter_base_de_dados = get_db