from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Conexão PostgreSQL utilizando o driver otimizado 'psycopg' (v3)
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg://postgres:123@localhost:5432/ludarium_auth"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()