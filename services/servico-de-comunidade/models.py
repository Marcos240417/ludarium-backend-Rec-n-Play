# Caminho: models.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class NotificationModel(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)    # Destinatário da notificação (email)
    content = Column(Text, nullable=False)                  # Texto da notificação
    link = Column(String, nullable=True)                    # URL opcional para redirecionamento
    is_read = Column(Integer, default=0)                    # 0 = Não lida, 1 = Lida
    created_at = Column(DateTime, default=datetime.utcnow)

class PublicacaoModel(Base):
    __tablename__ = "publicacoes_comunidade"

    id = Column(Integer, primary_key=True, index=True)
    autor = Column(String, nullable=False)
    autor_arroba = Column(String, nullable=False)
    creator_email = Column(String, nullable=True)            # Suporte a notificações ao criador
    comunidade = Column(String, nullable=False)
    tipo_badge = Column(String, nullable=False)
    titulo = Column(String, nullable=False)
    conteudo = Column(Text, nullable=False)
    tags = Column(String, nullable=False)
    votos = Column(Integer, default=0)
    interessados_qtd = Column(Integer, default=0)
    favorito = Column(Integer, default=0)

    comentarios = relationship("ComentarioModel", back_populates="publicacao", cascade="all, delete-orphan")
    interessados_rel = relationship("PublicacaoInteressadoModel", back_populates="publicacao", cascade="all, delete-orphan")
    votos_rel = relationship("PublicacaoVotoModel", back_populates="publicacao", cascade="all, delete-orphan")
    favoritos_rel = relationship("PublicacaoFavoritoModel", back_populates="publicacao", cascade="all, delete-orphan")
    candidatos_rel = relationship("PublicacaoCandidatoModel", back_populates="publicacao", cascade="all, delete-orphan")

class PublicacaoInteressadoModel(Base):
    __tablename__ = "publicacao_interessados"
    id = Column(Integer, primary_key=True, index=True)
    publicacao_id = Column(Integer, ForeignKey("publicacoes_comunidade.id", ondelete="CASCADE"), nullable=False)
    user_email = Column(String, nullable=False)
    __table_args__ = (UniqueConstraint('publicacao_id', 'user_email', name='_pub_user_interessado_uc'),)
    publicacao = relationship("PublicacaoModel", back_populates="interessados_rel")

class PublicacaoCandidatoModel(Base):
    __tablename__ = "publicacao_candidatos"
    id = Column(Integer, primary_key=True, index=True)
    publicacao_id = Column(Integer, ForeignKey("publicacoes_comunidade.id", ondelete="CASCADE"), nullable=False)
    user_email = Column(String, nullable=False)
    nome = Column(String, nullable=False)
    username = Column(String, nullable=False)
    papel = Column(String, nullable=True)
    status = Column(String, default="pendente") # "pendente", "aprovado", "reprovado"
    chat_liberado = Column(Integer, default=0)  # <-- ADICIONE ESTA LINHA AQUI
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('publicacao_id', 'user_email', name='_pub_user_candidato_uc'),)
    publicacao = relationship("PublicacaoModel", back_populates="candidatos_rel")

class PublicacaoVotoModel(Base):
    __tablename__ = "publicacao_votos"
    id = Column(Integer, primary_key=True, index=True)
    publicacao_id = Column(Integer, ForeignKey("publicacoes_comunidade.id", ondelete="CASCADE"), nullable=False)
    user_email = Column(String, nullable=False)
    __table_args__ = (UniqueConstraint('publicacao_id', 'user_email', name='_pub_user_voto_uc'),)
    publicacao = relationship("PublicacaoModel", back_populates="votos_rel")

class PublicacaoFavoritoModel(Base):
    __tablename__ = "publicacao_favoritos"
    id = Column(Integer, primary_key=True, index=True)
    publicacao_id = Column(Integer, ForeignKey("publicacoes_comunidade.id", ondelete="CASCADE"), nullable=False)
    user_email = Column(String, nullable=False)
    __table_args__ = (UniqueConstraint('publicacao_id', 'user_email', name='_pub_user_favorito_uc'),)
    publicacao = relationship("PublicacaoModel", back_populates="favoritos_rel")

class ComentarioModel(Base):
    __tablename__ = "comentarios_publicacao"

    id = Column(Integer, primary_key=True, index=True)
    publicacao_id = Column(Integer, ForeignKey("publicacoes_comunidade.id", ondelete="CASCADE"), nullable=False)
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
    recipient_email = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(String, nullable=False)

# --- FÓRUNS PÚBLICOS E TÓPICOS DE CHAT ---

class ForumModel(Base):
    __tablename__ = "foruns_publicos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descricao = Column(Text, nullable=False)
    categoria = Column(String, nullable=False)
    creator_email = Column(String, nullable=False)
    is_suspended = Column(Integer, default=0)        # 0 = Ativo, 1 = Banido/Suspenso
    suspend_reason = Column(Text, nullable=True)     # Motivo do banimento/suspensão
    suspended_until = Column(DateTime, nullable=True) # Prazo limite da suspensão
    created_at = Column(DateTime, default=datetime.utcnow)

    topicos = relationship("ForumTopicoModel", back_populates="forum", cascade="all, delete-orphan")
    denuncias = relationship("ForumDenunciaModel", back_populates="forum", cascade="all, delete-orphan")

class ForumTopicoModel(Base):
    __tablename__ = "forum_topicos"

    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("foruns_publicos.id", ondelete="CASCADE"), nullable=False)
    titulo = Column(String, nullable=False)
    conteudo = Column(Text, nullable=True)
    autor = Column(String, nullable=False)
    autor_email = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    forum = relationship("ForumModel", back_populates="topicos")
    mensagens = relationship("ForumTopicoMensagemModel", back_populates="topico", cascade="all, delete-orphan")

class ForumTopicoMensagemModel(Base):
    __tablename__ = "forum_topico_mensagens"

    id = Column(Integer, primary_key=True, index=True)
    topico_id = Column(Integer, ForeignKey("forum_topicos.id", ondelete="CASCADE"), nullable=False)
    conteudo = Column(Text, nullable=False)
    autor = Column(String, nullable=False)
    autor_email = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    topico = relationship("ForumTopicoModel", back_populates="mensagens")

# --- GRUPOS PRIVADOS DE EQUIPA E CHATS RECRUTAMENTO ---

class GrupoPrivadoModel(Base):
    __tablename__ = "grupos_privados"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    descricao = Column(Text, nullable=True)
    tipo = Column(String, default="privado")
    owner_email = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    membros = relationship("GrupoMembroModel", back_populates="grupo", cascade="all, delete-orphan")
    mensagens = relationship("GrupoMensagemModel", back_populates="grupo", cascade="all, delete-orphan")

class GrupoMembroModel(Base):
    __tablename__ = "grupo_membros"

    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey("grupos_privados.id", ondelete="CASCADE"), nullable=False)
    user_email = Column(String, nullable=False)
    role = Column(String, default="membro")
    
    __table_args__ = (UniqueConstraint('grupo_id', 'user_email', name='_grupo_user_uc'),)
    grupo = relationship("GrupoPrivadoModel", back_populates="membros")

class GrupoMensagemModel(Base):
    __tablename__ = "grupo_mensagens"

    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey("grupos_privados.id", ondelete="CASCADE"), nullable=False)
    autor = Column(String, nullable=False)
    autor_email = Column(String, nullable=False)
    conteudo = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    grupo = relationship("GrupoPrivadoModel", back_populates="mensagens")

class ForumDenunciaModel(Base):
    __tablename__ = "foruns_denuncias"

    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("foruns_publicos.id", ondelete="CASCADE"), nullable=False)
    autor_email = Column(String, index=True, nullable=False)
    motivo = Column(Text, nullable=False)
    evidencia = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    forum = relationship("ForumModel", back_populates="denuncias")

class CandidaturaMensagemModel(Base):
    __tablename__ = "candidatura_mensagens"

    id = Column(Integer, primary_key=True, index=True)
    candidatura_id = Column(Integer, nullable=False, index=True)
    autor = Column(String, nullable=False)
    autor_email = Column(String, nullable=False)
    conteudo = Column(Text, nullable=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat() + "Z")