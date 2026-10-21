from pydantic import BaseModel

class LinkResponse(BaseModel):
    rotulo: str
    url: str
    class Config:
        from_attributes = True

class ComunidadeResponse(BaseModel):
    nome: str
    membros: str
    class Config:
        from_attributes = True

class ProjetoDestaqueResponse(BaseModel):
    titulo: str
    papel: str
    progresso: int
    status_badge: str
    likes: int
    class Config:
        from_attributes = True

class AtividadeResponse(BaseModel):
    descricao: str
    tempo_atras: str
    likes: int
    comentarios_qtd: int
    comentario_destaque: str | None = None
    class Config:
        from_attributes = True

class TrofeuResponse(BaseModel):
    titulo: str
    descricao: str
    concluido: bool
    class Config:
        from_attributes = True

class PerfilCompletoResponse(BaseModel):
    id: int
    utilizador_email: str
    nome: str
    arroba: str
    localizacao: str
    biografia: str
    badge_funcao: str
    nivel: int
    xp_atual: int
    xp_proximo_nivel: int
    seguidores_qtd: int
    seguindo_qtd: int
    projetos_qtd: int
    contribuicoes_anuais: int
    links: list[LinkResponse] = []
    comunidades: list[ComunidadeResponse] = []
    projetos_destaque: list[ProjetoDestaqueResponse] = []
    atividades: list[AtividadeResponse] = []
    trofeus: list[TrofeuResponse] = []

    class Config:
        from_attributes = True