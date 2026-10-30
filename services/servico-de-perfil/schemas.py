from pydantic import BaseModel
from typing import Optional, List

class LinkUpdateSchema(BaseModel):
    rotulo: str
    url: str

    class Config:
        from_attributes = True

class PerfilUpdate(BaseModel):
    nome: Optional[str] = None
    arroba: Optional[str] = None
    localizacao: Optional[str] = None
    biografia: Optional[str] = None
    badge_funcao: Optional[str] = None
    links: Optional[List[LinkUpdateSchema]] = None

    class Config:
        from_attributes = True

class LinkResponse(BaseModel):
    id: int
    rotulo: str
    url: str

    class Config:
        from_attributes = True

class ComunidadeResponse(BaseModel):
    id: int
    nome: str
    membros: str  # Ajustado para string para aceitar formatos descritivos como "12,8 mil membros"

    class Config:
        from_attributes = True

class ProjetoDestaqueResponse(BaseModel):
    id: int
    titulo: str
    papel: str
    progresso: int
    status_badge: str
    likes: int

    class Config:
        from_attributes = True

class AtividadeResponse(BaseModel):
    id: int
    descricao: str
    tempo_atras: str
    likes: int
    comentarios_qtd: int
    comentario_destaque: Optional[str] = None

    class Config:
        from_attributes = True

class TrofeuResponse(BaseModel):
    id: int
    titulo: str
    descricao: str
    concluido: bool

    class Config:
        from_attributes = True

class PerfilCompletoResponse(BaseModel):
    id: int
    utilizador_email: str
    nome: Optional[str] = ""
    arroba: Optional[str] = ""
    localizacao: Optional[str] = ""
    biografia: Optional[str] = ""
    badge_funcao: Optional[str] = "NOVO MEMBRO"
    nivel: int
    xp_atual: int
    xp_proximo_nivel: int
    seguidores_qtd: int
    seguindo_qtd: int
    projetos_qtd: int
    contribuicoes_anuais: int
    links: List[LinkResponse] = []
    comunidades: List[ComunidadeResponse] = []
    projetos_destaque: List[ProjetoDestaqueResponse] = []
    atividades: List[AtividadeResponse] = []
    trofeus: List[TrofeuResponse] = []

    class Config:
        from_attributes = True

PerfilResponse = PerfilCompletoResponse