from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import models, database, schemas

SECRET_KEY = "ludarium_super_secret_key_jwt"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8080/login")

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Serviço de Comunidade - Ludarium", version="1.0.0")

def obter_utilizador_atual(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais de autenticação",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return email
    except JWTError:
        raise credentials_exception

@app.get("/")
def raiz():
    return {"mensagem": "Serviço de Comunidade com autenticação JWT e vínculo por utilizador a funcionar!"}

@app.get("/publicacoes", response_model=list[schemas.PublicacaoResponse])
def listar_publicacoes(db: Session = Depends(database.obter_base_de_dados)):
    publicacoes = db.query(models.PublicacaoModel).all()
    
    if not publicacoes:
        pub1 = models.PublicacaoModel(
            autor="Caio Martins",
            autor_arroba="@caiomakes",
            comunidade="Dev Indie Brasil",
            tipo_badge="PROCURANDO EQUIPE",
            titulo="Precisamos de uma artista 2D para uma game jam de 10 dias",
            conteudo="Somos três pessoas trabalhando em um jogo de exploração sobre memórias. Já temos programação, música e narrativa. Procuramos alguém que goste de pixel art com paleta limitada.",
            tags="godot,pixel art,romuto",
            votos=12,
            interessados_qtd=7,
            favorito=0
        )
        db.add(pub1)
        db.commit()
        db.refresh(pub1)
        
        com1 = models.ComentarioModel(
            publicacao_id=pub1.id,
            autor="Mariana Costa",
            autor_arroba="@marianacosta",
            conteudo="Adoro pixel art! Posso enviar meu portfólio?"
        )
        db.add(com1)
        db.commit()
        
        publicacoes = db.query(models.PublicacaoModel).all()

    resultado = []
    for p in publicacoes:
        tags_lista = [t.strip() for t in p.tags.split(",") if t.strip()]
        comentarios_formatados = [
            {
                "id": c.id,
                "publicacao_id": c.publicacao_id,
                "autor": c.autor,
                "autor_arroba": c.autor_arroba,
                "conteudo": c.conteudo
            } for c in p.comentarios
        ]
        resultado.append({
            "id": p.id,
            "autor": p.autor,
            "autor_arroba": p.autor_arroba,
            "comunidade": p.comunidade,
            "tipo_badge": p.tipo_badge,
            "titulo": p.titulo,
            "conteudo": p.conteudo,
            "tags": tags_lista,
            "votos": p.votos,
            "comentarios_qtd": len(comentarios_formatados),
            "interessados_qtd": p.interessados_qtd,
            "favorito": p.favorito,
            "comentarios": comentarios_formatados
        })
    return resultado

@app.post("/publicacoes", response_model=schemas.PublicacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_publicacao(pub: schemas.PublicacaoCreate, db: Session = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    """Cria uma nova publicação associada ao utilizador autenticado"""
    nome_utilizador = utilizador_email.split('@')[0]
    tags_str = ",".join(pub.tags)
    
    nova_pub = models.PublicacaoModel(
        autor=nome_utilizador,
        autor_arroba=f"@{nome_utilizador}",
        comunidade=pub.comunidade,
        tipo_badge=pub.tipo_badge,
        titulo=pub.titulo,
        conteudo=pub.conteudo,
        tags=tags_str,
        votos=0,
        interessados_qtd=0,
        favorito=0
    )
    db.add(nova_pub)
    db.commit()
    db.refresh(nova_pub)
    
    return {
        "id": nova_pub.id,
        "autor": nova_pub.autor,
        "autor_arroba": nova_pub.autor_arroba,
        "comunidade": nova_pub.comunidade,
        "tipo_badge": nova_pub.tipo_badge,
        "titulo": nova_pub.titulo,
        "conteudo": nova_pub.conteudo,
        "tags": pub.tags,
        "votos": nova_pub.votos,
        "comentarios_qtd": 0,
        "interessados_qtd": nova_pub.interessados_qtd,
        "favorito": nova_pub.favorito,
        "comentarios": []
    }

@app.post("/publicacoes/{publicacao_id}/comentarios", response_model=schemas.ComentarioResponse, status_code=status.HTTP_201_CREATED)
def adicionar_comentario(publicacao_id: int, comentario: schemas.ComentarioCreate, db: Session = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    """Adiciona um comentário associado ao utilizador autenticado"""
    pub = db.query(models.PublicacaoModel).filter(models.PublicacaoModel.id == publicacao_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    
    nome_utilizador = utilizador_email.split('@')[0]
    novo_comentario = models.ComentarioModel(
        publicacao_id=publicacao_id,
        autor=nome_utilizador,
        autor_arroba=f"@{nome_utilizador}",
        conteudo=comentario.conteudo
    )
    db.add(novo_comentario)
    db.commit()
    db.refresh(novo_comentario)
    return novo_comentario

@app.patch("/publicacoes/{publicacao_id}/participar", response_model=schemas.PublicacaoResponse)
def quero_participar(publicacao_id: int, db: Session = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    """Regista o clique do utilizador autenticado no botão Quero Participar"""
    pub = db.query(models.PublicacaoModel).filter(models.PublicacaoModel.id == publicacao_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    
    pub.interessados_qtd += 1
    db.commit()
    db.refresh(pub)
    
    tags_lista = [t.strip() for t in pub.tags.split(",") if t.strip()]
    comentarios_formatados = [
        {"id": c.id, "publicacao_id": c.publicacao_id, "autor": c.autor, "autor_arroba": c.autor_arroba, "conteudo": c.conteudo} 
        for c in pub.comentarios
    ]
    
    return {
        "id": pub.id,
        "autor": pub.autor,
        "autor_arroba": pub.autor_arroba,
        "comunidade": pub.comunidade,
        "tipo_badge": pub.tipo_badge,
        "titulo": pub.titulo,
        "conteudo": pub.conteudo,
        "tags": tags_lista,
        "votos": pub.votos,
        "comentarios_qtd": len(comentarios_formatados),
        "interessados_qtd": pub.interessados_qtd,
        "favorito": pub.favorito,
        "comentarios": comentarios_formatados
    }

@app.patch("/publicacoes/{publicacao_id}/favorito", response_model=schemas.PublicacaoResponse)
def alternar_favorito(publicacao_id: int, db: Session = Depends(database.obter_base_de_dados), utilizador_email: str = Depends(obter_utilizador_atual)):
    """Alterna o estado de favorito para o utilizador autenticado"""
    pub = db.query(models.PublicacaoModel).filter(models.PublicacaoModel.id == publicacao_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    
    pub.favorito = 1 if pub.favorito == 0 else 0
    db.commit()
    db.refresh(pub)
    
    tags_lista = [t.strip() for t in pub.tags.split(",") if t.strip()]
    comentarios_formatados = [
        {"id": c.id, "publicacao_id": c.publicacao_id, "autor": c.autor, "autor_arroba": c.autor_arroba, "conteudo": c.conteudo} 
        for c in pub.comentarios
    ]
    
    return {
        "id": pub.id,
        "autor": pub.autor,
        "autor_arroba": pub.autor_arroba,
        "comunidade": pub.comunidade,
        "tipo_badge": pub.tipo_badge,
        "titulo": pub.titulo,
        "conteudo": pub.conteudo,
        "tags": tags_lista,
        "votos": pub.votos,
        "comentarios_qtd": len(comentarios_formatados),
        "interessados_qtd": pub.interessados_qtd,
        "favorito": pub.favorito,
        "comentarios": comentarios_formatados
    }

@app.get("/oportunidades", response_model=list[schemas.OportunidadeResponse])
def listar_oportunidades(db: Session = Depends(database.obter_base_de_dados)):
    return [
        {"id": 1, "titulo": "Artista 2D para game jam", "contexto": "Remoto • 10 dias", "tags": ["pixel art", "godot"], "interessados_qtd": 3},
        {"id": 2, "titulo": "Testadores para demo narrativa", "contexto": "Flexível • Voluntário", "tags": ["narrative", "py"], "interessados_qtd": 8},
        {"id": 3, "titulo": "Compositor para jogo de terror", "contexto": "Remoto • Revenue share", "tags": ["audio", "unity"], "interessados_qtd": 2}
    ]

@app.get("/recomendados/skills", response_model=list[schemas.PerfilRecomendadoResponse])
def listar_perfis_recomendados(db: Session = Depends(database.obter_base_de_dados)):
    return [
        {"id": 1, "nome": "Marina Costa", "papel": "Artista 3D • Blender", "compatibilidade_porcentagem": 92},
        {"id": 2, "nome": "Rafael Lima", "papel": "Programador • Godot", "compatibilidade_porcentagem": 87},
        {"id": 3, "nome": "Yasmin Alves", "papel": "UI/UX Designer", "compatibilidade_porcentagem": 81}
    ]