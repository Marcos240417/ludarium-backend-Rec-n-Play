from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    studio = Column(String, default="Estúdio Independente")
    description = Column(Text)
    progress = Column(Integer, default=100)
    tags = Column(String, default="")
    likes = Column(Integer, default=0)
    favorito = Column(Integer, default=0)
    executavel_navegador = Column(Integer, default=0)
    build_path = Column(String, nullable=True)
    poster_path = Column(String, nullable=True)
    campaign_id = Column(Integer, nullable=True)
    owner = Column(String, nullable=True)
    user_id = Column(String, nullable=True)
    members = Column(String, default="")

    comentarios = relationship("ProjectCommentModel", back_populates="projeto", cascade="all, delete-orphan")

class ProjectCommentModel(Base):
    __tablename__ = "project_comments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    autor = Column(String)
    autor_arroba = Column(String)
    conteudo = Column(Text)

    projeto = relationship("ProjectModel", back_populates="comentarios")