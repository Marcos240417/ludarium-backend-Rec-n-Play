# Caminho: schemas.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class NotificationResponse(BaseModel):
    id: int
    content: str
    link: Optional[str] = None
    is_read: int
    created_at: datetime

    class Config:
        from_attributes = True

class ComentarioCreate(BaseModel):
    conteudo: str

class ComentarioResponse(BaseModel):
    id: int
    publicacao_id: int
    autor: str
    autor_arroba: str
    conteudo: str

    class Config:
        from_attributes = True

class PublicacaoCreate(BaseModel):
    comunidade: str
    tipo_badge: str
    titulo: str
    conteudo: str
    tags: List[str]

class PublicacaoResponse(BaseModel):
    id: int
    autor: str
    autor_arroba: str
    creator_email: Optional[str] = None
    comunidade: str
    tipo_badge: str
    titulo: str
    conteudo: str
    tags: List[str]
    votos: int
    comentarios_qtd: int
    interessados_qtd: int
    favorito: int
    comentarios: List[ComentarioResponse] = []

    class Config:
        from_attributes = True

# --- NOVO SCHEMA: Gestão de Candidatos / Interessados em Campanhas ---
class CandidatoResponse(BaseModel):
    id: int
    publicacao_id: int
    user_email: str
    nome: str
    username: str
    papel: Optional[str] = None
    status: str
    avatar: str

    class Config:
        from_attributes = True

class OportunidadeResponse(BaseModel):
    id: int
    titulo: str
    contexto: str
    tags: List[str]
    interessados_qtd: int

    class Config:
        from_attributes = True

class PerfilRecomendadoResponse(BaseModel):
    id: int
    nome: str
    papel: str
    compatibilidade_porcentagem: int

    class Config:
        from_attributes = True

# --- SCHEMAS: FÓRUNS PÚBLICOS E CHAT DIRETO ---

class ForumCreate(BaseModel):
    titulo: str
    descricao: str
    categoria: str

class ForumResponse(BaseModel):
    id: int
    titulo: str
    descricao: str
    categoria: str
    creator_email: str
    is_suspended: Optional[int] = 0
    suspend_reason: Optional[str] = None
    suspended_until: Optional[datetime] = None  # Suporte ao prazo limite da contagem regressiva
    created_at: datetime

    class Config:
        from_attributes = True

class ForumMensagemCreate(BaseModel):
    conteudo: str

class ForumMensagemResponse(BaseModel):
    id: int
    forum_id: int
    conteudo: str
    autor: str
    autor_email: str
    created_at: datetime

    class Config:
        from_attributes = True

class MembroForumResponse(BaseModel):
    nome: str
    email: str
    status: str

# --- SCHEMAS: GRUPOS PRIVADOS, RECRUTAMENTO E CHATS COM TÍTULO ---

class GrupoPrivadoCreate(BaseModel):
    nome: str  # Título obrigatório para o chat ou grupo
    descricao: Optional[str] = ""
    tipo: Optional[str] = "privado"  # "privado" (recrutamento) ou "grupo" (produção/jogos)
    membros_usernames: Optional[List[str]] = []

class MembroPapelUpdate(BaseModel):
    user_email: str
    role: str  # "admin" (1 a 3 administradores) ou "membro"

class GrupoPrivadoResponse(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    tipo: str
    owner_email: str
    created_at: datetime

    class Config:
        from_attributes = True

class GrupoMensagemCreate(BaseModel):
    conteudo: str

class GrupoMensagemResponse(BaseModel):
    id: int
    grupo_id: int
    autor: str
    autor_email: str
    conteudo: str
    created_at: datetime

    class Config:
        from_attributes = True

class ForumDenunciaCreate(BaseModel):
    motivo: str
    evidencia: Optional[str] = None

class ForumDenunciaResponse(BaseModel):
    id: int
    forum_id: int
    autor_email: str
    motivo: str
    evidencia: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True