from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class PublicacaoModel(Base):
    __tablename__ = "publicacoes_comunidade"

    id = Column(Integer, primary_key=True, index=True)
    autor = Column(String, nullable=False)
    autor_arroba = Column(String, nullable=False)
    comunidade = Column(String, nullable=False)
    tipo_badge = Column(String, nullable=False) # Ex: "PROCURANDO EQUIPE", "PEDIDO DE FEEDBACK", "DEVLOG"
    titulo = Column(String, nullable=False)
    conteudo = Column(Text, nullable=False)
    tags = Column(String, nullable=False) # Ex: "godot,pixel art"
    votos = Column(Integer, default=0)
    interessados_qtd = Column(Integer, default=0)
    favorito = Column(Integer, default=0) # 0 para falso, 1 para verdadeiro

    comentarios = relationship("ComentarioModel", back_populates="publicacao", cascade="all, delete-orphan")

class ComentarioModel(Base):
    __tablename__ = "comentarios_publicacao"

    id = Column(Integer, primary_key=True, index=True)
    publicacao_id = Column(Integer, ForeignKey("publicacoes_comunidade.id"), nullable=False)
    autor = Column(String, nullable=False)
    autor_arroba = Column(String, nullable=False)
    conteudo = Column(Text, nullable=False)

    publicacao = relationship("PublicacaoModel", back_populates="comentarios")

class OportunidadeModel(Base):
    __tablename__ = "oportunidades_abertas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    contexto = Column(String, nullable=False)
    tags = Column(String, nullable=False)
    interessados_qtd = Column(Integer, default=0)

class PerfilRecomendadoModel(Base):
    __tablename__ = "perfis_recomendados"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    papel = Column(String, nullable=False)
    compatibilidade_porcentagem = Column(Integer, nullable=False)

class MessageModel(Base):
    __tablename__ = "mensagens_privadas"
    id = Column(Integer, primary_key=True, index=True)
    sender_username = Column(String, nullable=False)
    recipient_email = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(String, nullable=False)   