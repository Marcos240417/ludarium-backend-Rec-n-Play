from pydantic import BaseModel
from typing import Optional, List

class CampanhaCreate(BaseModel):
    titulo: str
    descricao: str
    categoria: Optional[str] = "GAME JAM"
    nivel: Optional[str] = "Iniciante"
    recompensa_xp: Optional[int] = 2500

class ObjetivoResponse(BaseModel):
    id: int
    campanha_id: int
    titulo: str
    prazo: str
    recompensa_xp: str
    concluido: bool

    class Config:
        from_attributes = True

class CampanhaResponse(BaseModel):
    id: int
    titulo: str
    descricao: str
    categoria: str
    nivel: str
    participantes_qtd: int
    recompensa_xp: int
    formato: str
    progresso_porcentagem: int
    dias_restantes: int
    objetivos: List[ObjetivoResponse] = []

    class Config:
        from_attributes = True

class UsuarioProgressoResponse(BaseModel):
    id: int
    nivel: int
    titulo_nivel: str
    xp_atual: int
    xp_proximo_nivel: int
    projetos_concluidos: int
    badges_conquistados: int
    mentorias: int

    class Config:
        from_attributes = True