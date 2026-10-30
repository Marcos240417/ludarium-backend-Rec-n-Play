import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# URL de conexão assíncrona para o PostgreSQL usando asyncpg
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:123@localhost:5432/ludarium_comunidade"
)

# 1. Criar o engine assíncrono
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True)

# 2. Criar o SessionLocal assíncrono utilizando o async_sessionmaker
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

# 3. Função assíncrona para obter a sessão da base de dados
async def get_db():
    async with SessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()

# Alias para manter compatibilidade com o resto do código
obter_base_de_dados = get_db