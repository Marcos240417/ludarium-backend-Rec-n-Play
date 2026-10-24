const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = 'http://localhost:8003';
const SERVICO_DE_CAMPANHAS = SERVICO_DE_CAMPANHAS_URL;
const SERVICO_DE_PERFIL_URL = "http://localhost:8004";
const GATEWAY_URL = "http://localhost:8005";

let listaPublicacoesGlobal = [];

// Função blindada para obter o token de autenticação
function obterToken() {
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token');

    if (token) {
        localStorage.setItem('ludarium_token', token);
    } else {
        token = localStorage.getItem('ludarium_token');
    }

    // Fallback de segurança para testes se o token estiver totalmente ausente
    if (!token) {
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMSIsImV4cCI6MTc5Mjg3NTk3Nn0.8Kiajoqmtvmdt6ypcfUOGLwSEIPXmRC7ZNgU0_zpvNI";
        localStorage.setItem('ludarium_token', token);
    }

    return token;
}

// Extrair o nome do utilizador a partir do token JWT
function obterUtilizadorAtualNome() {
    const token = obterToken();
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);
        const email = payload.sub;
        return email ? email.split('@')[0] : null;
    } catch (e) {
        return "user1";
    }
}

async function carregarTudo() {
    await carregarPublicacoes();
    await carregarOportunidades();
    await carregarPerfis();
}

async function carregarPublicacoes() {
    const loadingEl = document.getElementById('loading');
    const utilizadorAtual = obterUtilizadorAtualNome();

    try {
        const response = await fetch(`${GATEWAY_URL}/publicacoes`);
        if (!response.ok) throw new Error('Falha ao obter publicações.');

        listaPublicacoesGlobal = await response.json();
        if (loadingEl) loadingEl.style.display = 'none';
        renderizarPublicacoes(listaPublicacoesGlobal, utilizadorAtual);
    } catch (error) {
        if (loadingEl) {
            loadingEl.textContent = 'Erro ao carregar publicações: ' + error.message;
            loadingEl.style.color = '#ef4444';
        }
    }
}

function renderizarPublicacoes(publicacoes, utilizadorAtual) {
    const gridEl = document.getElementById('communities-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    if (publicacoes.length === 0) {
        gridEl.innerHTML = '<p>Nenhuma publicação encontrada.</p>';
        return;
    }

    publicacoes.forEach(pub => {
        const card = document.createElement('div');
        card.className = 'community-card';
        card.style.cssText = "background: #181b28; border: 1px solid #2a2e43; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;";
        
        const ehDonoPub = utilizadorAtual && pub.autor && pub.autor.toLowerCase() === utilizadorAtual.toLowerCase();
        const botoesPubHtml = ehDonoPub ? `
            <div style="display: flex; gap: 0.5rem;">
                <button onclick='abrirModalEditar(${JSON.stringify(pub)})' style="background: transparent; border: 1px solid #475569; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" title="Editar Publicação">✏️ Editar</button>
                <button onclick="apagarPublicacao(${pub.id})" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" title="Apagar Publicação">🗑️ Apagar</button>
            </div>
        ` : '';

        const comentariosHtml = (pub.comentarios || []).map(c => {
            const ehDonoComentario = utilizadorAtual && c.autor && c.autor.toLowerCase() === utilizadorAtual.toLowerCase();
            const botaoApagarComHtml = ehDonoComentario
                ? `<button onclick="apagarComentario(${c.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.8rem;" title="Apagar Comentário">🗑️</button>`
                : '';

            return `
                <div class="comment-item" style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.9rem; color: #cbd5e1;">
                    <div><strong>${c.autor}:</strong> ${c.conteudo}</div>
                    ${botaoApagarComHtml}
                </div>
            `;
        }).join('');

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <span class="badge" style="background: #2563eb; color: white; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: bold;">${pub.tipo_badge}</span>
                ${botoesPubHtml}
            </div>
            <h3 style="margin: 0 0 0.25rem 0; font-size: 1.25rem; color: white;">${pub.titulo}</h3>
            <div class="author-info" style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;">Por ${pub.autor} (${pub.autor_arroba}) em <strong>${pub.comunidade}</strong></div>
            <div class="content-text" style="color: #e2e8f0; margin-bottom: 1rem; line-height: 1.5;">${pub.conteudo}</div>
            <div class="stats" style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;">👥 Interessados: ${pub.interessados_qtd || 0} | 👍 Votos: ${pub.votos || 0}</div>
            
            <div class="card-footer" style="border-top: 1px solid #2a2e43; padding-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn-primary" onclick="participarPublicacao(${pub.id})" style="background: #334155; font-size: 0.8rem; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; color: white;">Quero Participar</button>
                <button class="btn-primary" onclick="votarPublicacao(${pub.id})" style="background: #334155; font-size: 0.8rem; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; color: white;">👍 Votar</button>
                <button class="btn-primary" onclick="alternarFavorito(${pub.id})" style="background: #334155; font-size: 0.8rem; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; color: white;">❤️ Favorito</button>
            </div>

            <div class="comments-section" style="margin-top: 1rem; border-top: 1px dashed #2a2e43; padding-top: 0.75rem;">
                <h4 style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 0.5rem;">Comentários (${pub.comentarios_qtd || 0})</h4>
                <div id="comments-list-${pub.id}">${comentariosHtml}</div>
                <div class="comment-form" style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                    <input type="text" id="comment-input-${pub.id}" placeholder="Escreva um comentário..." style="flex: 1; background: #0f172a; border: 1px solid #2a2e43; padding: 6px 10px; border-radius: 6px; color: white; font-size: 0.85rem;">
                    <button class="btn-primary" onclick="adicionarComentario(${pub.id})" style="background: #7c3aed; font-size: 0.8rem; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer;">Enviar</button>
                </div>
            </div>
        `;
        
        gridEl.appendChild(card);
    });
}

function filtrarPublicacoes() {
    const pesquisaEl = document.getElementById('input-pesquisa');
    const badgeEl = document.getElementById('select-filtro-badge');
    
    if (!pesquisaEl || !badgeEl) return;

    const termo = pesquisaEl.value.toLowerCase();
    const badgeFiltro = badgeEl.value;
    const utilizadorAtual = obterUtilizadorAtualNome();

    const filtradas = listaPublicacoesGlobal.filter(pub => {
        const matchTermo = pub.titulo.toLowerCase().includes(termo) || pub.conteudo.toLowerCase().includes(termo);
        const matchBadge = badgeFiltro === "" || pub.tipo_badge === badgeFiltro;
        return matchTermo && matchBadge;
    });

    renderizarPublicacoes(filtradas, utilizadorAtual);
}

async function votarPublicacao(id) {
    const token = obterToken();
    try {
        const res = await fetch(`${GATEWAY_URL}/publicacoes/${id}/votar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao registar voto.');
        carregarPublicacoes();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

function abrirModalEditar(pub) {
    document.getElementById('edit-pub-id').value = pub.id;
    document.getElementById('edit-pub-titulo').value = pub.titulo;
    document.getElementById('edit-pub-badge').value = pub.tipo_badge;
    document.getElementById('edit-pub-comunidade').value = pub.comunidade;
    document.getElementById('edit-pub-conteudo').value = pub.conteudo;
    document.getElementById('edit-pub-tags').value = pub.tags ? pub.tags.join(', ') : '';
    document.getElementById('modal-editar').style.display = 'flex';
}

function fecharModalEditar() {
    document.getElementById('modal-editar').style.display = 'none';
}

async function salvarEdicaoPublicacao(event) {
    event.preventDefault();
    const token = obterToken();
    const id = document.getElementById('edit-pub-id').value;
    const tagsInput = document.getElementById('edit-pub-tags').value;
    const tagsArray = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];
    const nomeAtual = obterUtilizadorAtualNome() || "Utilizador";

    const dadosAtualizados = {
        autor: nomeAtual,
        autor_arroba: "@" + nomeAtual,
        comunidade: document.getElementById('edit-pub-comunidade').value,
        tipo_badge: document.getElementById('edit-pub-badge').value,
        titulo: document.getElementById('edit-pub-titulo').value,
        conteudo: document.getElementById('edit-pub-conteudo').value,
        tags: tagsArray
    };

    try {
        const res = await fetch(`${GATEWAY_URL}/publicacoes/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados)
        });

        if (!res.ok) throw new Error('Falha ao atualizar publicação.');

        fecharModalEditar();
        carregarPublicacoes();
        alert('Publicação atualizada com sucesso!');
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

async function carregarOportunidades() {
    try {
        const res = await fetch(`${GATEWAY_URL}/oportunidades`);
        const ops = await res.json();
        const container = document.getElementById('oportunidades-list');
        if (container) {
            container.innerHTML = ops.map(o => `
                <div class="sidebar-item" style="margin-bottom: 0.75rem; border-bottom: 1px solid #2a2e43; padding-bottom: 0.5rem;">
                    <strong style="color: white; font-size: 0.9rem;">${o.titulo}</strong><br>
                    <span style="font-size:0.8rem; color:#9ca3af;">${o.contexto}</span>
                </div>
            `).join('');
        }
    } catch (e) {
        const container = document.getElementById('oportunidades-list');
        if (container) container.textContent = 'Erro ao carregar oportunidades.';
    }
}

async function carregarPerfis() {
    try {
        const res = await fetch(`${GATEWAY_URL}/recomendados/skills`);
        const perfis = await res.json();
        const container = document.getElementById('perfis-list');
        if (container) {
            container.innerHTML = perfis.map(p => `
                <div class="sidebar-item" style="margin-bottom: 0.75rem; border-bottom: 1px solid #2a2e43; padding-bottom: 0.5rem;">
                    <strong style="color: white; font-size: 0.9rem;">${p.nome}</strong> (${p.compatibilidade_porcentagem}% match)<br>
                    <span style="font-size:0.8rem; color:#9ca3af;">${p.papel}</span>
                </div>
            `).join('');
        }
    } catch (e) {
        const container = document.getElementById('perfis-list');
        if (container) container.textContent = 'Erro ao carregar perfis.';
    }
}

function abrirModalPublicacao() {
    document.getElementById('modal-pub').style.display = 'flex';
}

function fecharModalPublicacao() {
    document.getElementById('modal-pub').style.display = 'none';
}

async function criarPublicacao(event) {
    event.preventDefault();
    const token = obterToken();

    const tagsInput = document.getElementById('pub-tags').value;
    const tagsArray = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];
    const nomeAtual = obterUtilizadorAtualNome() || "Utilizador";

    const novaPub = {
        autor: nomeAtual,
        autor_arroba: "@" + nomeAtual,
        comunidade: document.getElementById('pub-comunidade').value,
        tipo_badge: document.getElementById('pub-badge').value,
        titulo: document.getElementById('pub-titulo').value,
        conteudo: document.getElementById('pub-conteudo').value,
        tags: tagsArray
    };

    try {
        const res = await fetch(`${GATEWAY_URL}/publicacoes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novaPub)
        });

        if (!res.ok) throw new Error('Falha ao criar publicação.');

        // --- NOVO: RECOMPENSA DE XP POR CRIAR PUBLICAÇÃO ---
        await fetch(`${GATEWAY_URL}/perfil/adicionar-xp`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ xp: 50 }) // Atribui 50 XP
        });

        fecharModalPublicacao();
        document.getElementById('form-nova-pub').reset();
        carregarPublicacoes();
        alert('Publicação criada com sucesso! Ganhou +50 XP 🎉');
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function participarPublicacao(id) {
    const token = obterToken();
    try {
        const res = await fetch(`${GATEWAY_URL}/publicacoes/${id}/participar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao participar.');
        carregarPublicacoes();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

async function alternarFavorito(id) {
    const token = obterToken();
    try {
        const res = await fetch(`${GATEWAY_URL}/publicacoes/${id}/favorito`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao favoritar.');
        carregarPublicacoes();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

async function adicionarComentario(publicacaoId) {
    const token = obterToken();
    const input = document.getElementById(`comment-input-${publicacaoId}`);
    const conteudo = input.value.trim();
    if (!conteudo) return;

    const nomeAtual = obterUtilizadorAtualNome() || "Utilizador";
    const novoComentario = {
        autor: nomeAtual,
        autor_arroba: "@" + nomeAtual,
        conteudo: conteudo
    };

    try {
        const res = await fetch(`${GATEWAY_URL}/publicacoes/${publicacaoId}/comentarios`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novoComentario)
        });

        if (!res.ok) throw new Error('Falha ao adicionar comentário.');

        input.value = '';
        carregarPublicacoes();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function apagarPublicacao(id) {
    const token = obterToken();
    if (!confirm('Tem certeza que deseja apagar esta publicação?')) return;

    try {
        const res = await fetch(`${GATEWAY_URL}/publicacoes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao apagar publicação.');
        carregarPublicacoes();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

async function apagarComentario(id) {
    const token = obterToken();
    if (!confirm('Deseja apagar este comentário?')) return;

    try {
        const res = await fetch(`${GATEWAY_URL}/comentarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao apagar comentário.');
        carregarPublicacoes();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

document.addEventListener('DOMContentLoaded', carregarTudo);