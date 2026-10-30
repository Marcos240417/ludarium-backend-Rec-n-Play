from pydantic import BaseModel
from typing import List, Optional

class ComentarioProjetoCreate(BaseModel):
    conteudo: str

class ComentarioProjetoResponse(BaseModel):
    id: int
    project_id: int
    autor: str
    autor_arroba: str
    conteudo: str

    class Config:
        from_attributes = True

class ProjectResponse(BaseModel):
    id: int
    title: str
    studio: Optional[str] = "Estúdio Independente"
    description: str
    progress: Optional[int] = 100
    tags: List[str] = []
    likes: Optional[int] = 0
    favorito: Optional[int] = 0
    executavel_navegador: Optional[int] = 0
    build_path: Optional[str] = None
    poster_path: Optional[str] = None
    campaign_id: Optional[int] = None
    members: Optional[str] = ""
    owner: Optional[str] = None
    user_id: Optional[str] = None
    status: Optional[str] = "Ativo"
    inspection_reason: Optional[str] = None
    inspection_message: Optional[str] = None
    inspection_reply: Optional[str] = None  
    comments_count: Optional[int] = 0
    comentarios: List[ComentarioProjetoResponse] = []

    class Config:
        from_attributes = True

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    progress: Optional[int] = None
    tags: Optional[str] = None
    campaign_id: Optional[int] = None
    members: Optional[str] = None
    inspection_reply: Optional[str] = None  

class CampaignResponse(BaseModel):
    id: int
    title: str
    subtitle: str
    projects_count: int
    participants_count: int

class CommunityResponse(BaseModel):
    id: int
    name: str
    members_count: str