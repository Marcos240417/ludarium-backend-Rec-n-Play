import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# URL de conexão assíncrona para o serviço de campanhas
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:123@localhost:5432/ludarium_campanhas"
)

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def obter_base_de_dados():
    async with SessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()

# Alias de compatibilidade
get_db = obter_base_de_dados