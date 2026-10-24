from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class CampanhaModel(Base):
    __tablename__ = "campanhas_desafios"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descricao = Column(Text, nullable=False)
    categoria = Column(String, nullable=False) # Ex: "GAME JAM", "TRILHAS DE ESTUDO"
    nivel = Column(String, nullable=False) # Ex: "Intermediário"
    participantes_qtd = Column(Integer, default=0)
    recompensa_xp = Column(Integer, default=2500)
    formato = Column(String, default="Equipe")
    progresso_porcentagem = Column(Integer, default=0)
    dias_restantes = Column(Integer, default=12)
    ativa = Column(Boolean, default=True)

    objetivos = relationship("ObjetivoCampanhaModel", back_populates="campanha", cascade="all, delete-orphan")

class ObjetivoCampanhaModel(Base):
    __tablename__ = "objetivos_campanha"

    id = Column(Integer, primary_key=True, index=True)
    campanha_id = Column(Integer, ForeignKey("campanhas_desafios.id"), nullable=False)
    titulo = Column(String, nullable=False)
    prazo = Column(String, nullable=False)
    recompensa_xp = Column(String, nullable=False)
    concluido = Column(Boolean, default=False)

    campanha = relationship("CampanhaModel", back_populates="objetivos")

class UsuarioProgressoModel(Base):
    __tablename__ = "usuario_progresso_campanha"

    id = Column(Integer, primary_key=True, index=True)
    nivel = Column(Integer, default=24)
    titulo_nivel = Column(String, default="Criadora Experiente")
    xp_atual = Column(Integer, default=11400)
    xp_proximo_nivel = Column(Integer, default=15000)
    projetos_concluidos = Column(Integer, default=7)
    badges_conquistados = Column(Integer, default=12)
    mentorias = Column(Integer, default=4)