from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Utilize a sua palavra-passe real do PostgreSQL
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg://postgres:123@localhost:5432/ludarium_auth"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def obter_base_de_dados():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()