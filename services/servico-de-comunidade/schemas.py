from pydantic import BaseModel

class ComentarioCreate(BaseModel):
    autor: str
    autor_arroba: str
    conteudo: str

class ComentarioResponse(ComentarioCreate):
    id: int
    publicacao_id: int

    class Config:
        from_attributes = True

class PublicacaoCreate(BaseModel):
    autor: str
    autor_arroba: str
    comunidade: str
    tipo_badge: str
    titulo: str
    conteudo: str
    tags: list[str]

class PublicacaoResponse(BaseModel):
    id: int
    autor: str
    autor_arroba: str
    comunidade: str
    tipo_badge: str
    titulo: str
    conteudo: str
    tags: list[str]
    votos: int
    comentarios_qtd: int
    interessados_qtd: int
    favorito: int
    comentarios: list[ComentarioResponse] = []

    class Config:
        from_attributes = True

class OportunidadeResponse(BaseModel):
    id: int
    titulo: str
    contexto: str
    tags: list[str]
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