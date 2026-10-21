from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class PerfilModel(Base):
    __tablename__ = "perfis_utilizadores"

    id = Column(Integer, primary_key=True, index=True)
    utilizador_email = Column(String, unique=True, index=True, nullable=False)
    nome = Column(String, nullable=False)
    arroba = Column(String, nullable=False)
    localizacao = Column(String, nullable=False)
    biografia = Column(Text, nullable=False)
    badge_funcao = Column(String, default="FUNDADORA")
    nivel = Column(Integer, default=24)
    xp_atual = Column(Integer, default=11400)
    xp_proximo_nivel = Column(Integer, default=15000)
    seguidores_qtd = Column(Integer, default=284)
    seguindo_qtd = Column(Integer, default=96)
    projetos_qtd = Column(Integer, default=6)
    contribuicoes_anuais = Column(Integer, default=1248)

    links = relationship("PerfilLinkModel", back_populates="perfil", cascade="all, delete-orphan")
    comunidades = relationship("PerfilComunidadeModel", back_populates="perfil", cascade="all, delete-orphan")
    projetos_destaque = relationship("PerfilProjetoModel", back_populates="perfil", cascade="all, delete-orphan")
    atividades = relationship("PerfilAtividadeModel", back_populates="perfil", cascade="all, delete-orphan")
    trofeus = relationship("PerfilTrofeuModel", back_populates="perfil", cascade="all, delete-orphan")

class PerfilLinkModel(Base):
    __tablename__ = "perfil_links"
    id = Column(Integer, primary_key=True, index=True)
    perfil_id = Column(Integer, ForeignKey("perfis_utilizadores.id"), nullable=False)
    rotulo = Column(String, nullable=False)
    url = Column(String, nullable=False)
    perfil = relationship("PerfilModel", back_populates="links")

class PerfilComunidadeModel(Base):
    __tablename__ = "perfil_comunidades"
    id = Column(Integer, primary_key=True, index=True)
    perfil_id = Column(Integer, ForeignKey("perfis_utilizadores.id"), nullable=False)
    nome = Column(String, nullable=False)
    membros = Column(String, nullable=False)
    perfil = relationship("PerfilModel", back_populates="comunidades")

class PerfilProjetoModel(Base):
    __tablename__ = "perfil_projetos_destaque"
    id = Column(Integer, primary_key=True, index=True)
    perfil_id = Column(Integer, ForeignKey("perfis_utilizadores.id"), nullable=False)
    titulo = Column(String, nullable=False)
    papel = Column(String, nullable=False)
    progresso = Column(Integer, default=0)
    status_badge = Column(String, nullable=False)
    likes = Column(Integer, default=0)
    perfil = relationship("PerfilModel", back_populates="projetos_destaque")

class PerfilAtividadeModel(Base):
    __tablename__ = "perfil_atividades"
    id = Column(Integer, primary_key=True, index=True)
    perfil_id = Column(Integer, ForeignKey("perfis_utilizadores.id"), nullable=False)
    descricao = Column(Text, nullable=False)
    tempo_atras = Column(String, nullable=False)
    likes = Column(Integer, default=0)
    comentarios_qtd = Column(Integer, default=0)
    comentario_destaque = Column(Text, nullable=True)
    perfil = relationship("PerfilModel", back_populates="atividades")

class PerfilTrofeuModel(Base):
    __tablename__ = "perfil_trofeus"
    id = Column(Integer, primary_key=True, index=True)
    perfil_id = Column(Integer, ForeignKey("perfis_utilizadores.id"), nullable=False)
    titulo = Column(String, nullable=False)
    descricao = Column(String, nullable=False)
    concluido = Column(Boolean, default=False)
    perfil = relationship("PerfilModel", back_populates="trofeus")