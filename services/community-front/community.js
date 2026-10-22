const COMMUNITY_SERVICE_URL = "http://localhost:8002";
let listaPublicacoesGlobal = [];

async function carregarTudo() {
    await carregarPublicacoes();
    await carregarOportunidades();
    await carregarPerfis();
}

// Função auxiliar para obter o nome do utilizador atual com base no token JWT (Payload)
function obterUtilizadorAtualNome() {
    const token = localStorage.getItem('ludarium_token');
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);
        const email = payload.sub;
        return email ? email.split('@')[0] : null;
    } catch (e) {
        return null;
    }
}

async function carregarPublicacoes() {
    const loadingEl = document.getElementById('loading');
    const utilizadorAtual = obterUtilizadorAtualNome();

    try {
        const response = await fetch(`${COMMUNITY_SERVICE_URL}/publicacoes`);
        if (!response.ok) throw new Error('Falha ao obter publicações.');

        listaPublicacoesGlobal = await response.json();
        loadingEl.style.display = 'none';
        renderizarPublicacoes(listaPublicacoesGlobal, utilizadorAtual);
    } catch (error) {
        loadingEl.textContent = 'Erro ao carregar publicações: ' + error.message;
        loadingEl.style.color = '#ef4444';
    }
}

function renderizarPublicacoes(publicacoes, utilizadorAtual) {
    const gridEl = document.getElementById('communities-grid');
    gridEl.innerHTML = '';

    if (publicacoes.length === 0) {
        gridEl.innerHTML = '<p>Nenhuma publicação encontrada.</p>';
        return;
    }

    publicacoes.forEach(pub => {
        const card = document.createElement('div');
        card.className = 'community-card';
        
        // Verifica se o utilizador atual é o autor da publicação para mostrar os botões de editar e apagar
        const ehDonoPub = utilizadorAtual && pub.autor.toLowerCase() === utilizadorAtual.toLowerCase();
        const botoesPubHtml = ehDonoPub ? `
            <div style="display: flex; gap: 0.5rem;">
                <button onclick='abrirModalEditar(${JSON.stringify(pub)})' class="btn-action" style="font-size: 0.75rem; padding: 4px 8px;" title="Editar Publicação">✏️ Editar</button>
                <button onclick="apagarPublicacao(${pub.id})" class="btn-action" style="color: #ef4444; border-color: #ef4444; font-size: 0.75rem; padding: 4px 8px;" title="Apagar Publicação">🗑️ Apagar</button>
            </div>
        ` : '';

        // Mapeia os comentários e oculta o botão de lixeira se não for do utilizador
        const comentariosHtml = pub.comentarios.map(c => {
            const ehDonoComentario = utilizadorAtual && c.autor.toLowerCase() === utilizadorAtual.toLowerCase();
            const botaoApagarComHtml = ehDonoComentario
                ? `<button onclick="apagarComentario(${c.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.8rem;" title="Apagar Comentário">🗑️</button>`
                : '';

            return `
                <div class="comment-item" style="display: flex; justify-content: space-between; align-items: center;">
                    <div><strong>${c.autor}:</strong> ${c.conteudo}</div>
                    ${botaoApagarComHtml}
                </div>
            `;
        }).join('');

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <span class="badge" style="margin-bottom: 0;">${pub.tipo_badge}</span>
                ${botoesPubHtml}
            </div>
            <h3>${pub.titulo}</h3>
            <div class="author-info">Por ${pub.autor} (${pub.autor_arroba}) em <strong>${pub.comunidade}</strong></div>
            <div class="content-text">${pub.conteudo}</div>
            <div class="stats">👥 Interessados: ${pub.interessados_qtd} | 👍 Votos: ${pub.votos}</div>
            
            <div class="card-footer">
                <div class="card-actions">
                    <button class="btn-action" onclick="participarPublicacao(${pub.id})">Quero Participar</button>
                    <button class="btn-action" onclick="votarPublicacao(${pub.id})">👍 Votar</button>
                    <button class="btn-action btn-fav ${pub.favorito === 1 ? 'favoritado' : ''}" onclick="alternarFavorito(${pub.id})">❤️ Favorito</button>
                </div>
            </div>

            <div class="comments-section">
                <h4>Comentários (${pub.comentarios_qtd})</h4>
                <div id="comments-list-${pub.id}">${comentariosHtml}</div>
                <div class="comment-form">
                    <input type="text" id="comment-input-${pub.id}" placeholder="Escreva um comentário...">
                    <button class="btn-action" onclick="adicionarComentario(${pub.id})">Enviar</button>
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
    const token = localStorage.getItem('ludarium_token');
    if (!token) {
        alert('Precisa de estar autenticado para votar!');
        return;
    }

    try {
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/publicacoes/${id}/votar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao registrar voto.');
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
    const token = localStorage.getItem('ludarium_token');
    const id = document.getElementById('edit-pub-id').value;
    const tagsInput = document.getElementById('edit-pub-tags').value;
    const tagsArray = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

    const dadosAtualizados = {
        autor: obterUtilizadorAtualNome(),
        autor_arroba: "@" + obterUtilizadorAtualNome(),
        comunidade: document.getElementById('edit-pub-comunidade').value,
        tipo_badge: document.getElementById('edit-pub-badge').value,
        titulo: document.getElementById('edit-pub-titulo').value,
        conteudo: document.getElementById('edit-pub-conteudo').value,
        tags: tagsArray
    };

    try {
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/publicacoes/${id}`, {
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
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/oportunidades`);
        const ops = await res.json();
        const container = document.getElementById('oportunidades-list');
        container.innerHTML = ops.map(o => `
            <div class="sidebar-item">
                <strong>${o.titulo}</strong><br>
                <span style="font-size:0.8rem; color:#9ca3af;">${o.contexto}</span>
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('oportunidades-list').textContent = 'Erro ao carregar oportunidades.';
    }
}

async function carregarPerfis() {
    try {
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/recomendados/skills`);
        const perfis = await res.json();
        const container = document.getElementById('perfis-list');
        container.innerHTML = perfis.map(p => `
            <div class="sidebar-item">
                <strong>${p.nome}</strong> (${p.compatibilidade_porcentagem}% match)<br>
                <span style="font-size:0.8rem; color:#9ca3af;">${p.papel}</span>
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('perfis-list').textContent = 'Erro ao carregar perfis.';
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
    const token = localStorage.getItem('ludarium_token');
    if (!token) {
        alert('Precisa de estar autenticado para criar uma publicação!');
        return;
    }

    const tagsInput = document.getElementById('pub-tags').value;
    const tagsArray = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

    const novaPub = {
        autor: "Utilizador",
        autor_arroba: "@utilizador",
        comunidade: document.getElementById('pub-comunidade').value,
        tipo_badge: document.getElementById('pub-badge').value,
        titulo: document.getElementById('pub-titulo').value,
        conteudo: document.getElementById('pub-conteudo').value,
        tags: tagsArray
    };

    try {
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/publicacoes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novaPub)
        });

        if (!res.ok) throw new Error('Falha ao criar publicação.');

        fecharModalPublicacao();
        document.getElementById('form-nova-pub').reset();
        carregarPublicacoes();
        alert('Publicação criada com sucesso!');
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function participarPublicacao(id) {
    const token = localStorage.getItem('ludarium_token');
    if (!token) {
        alert('Precisa de estar autenticado!');
        return;
    }

    try {
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/publicacoes/${id}/participar`, {
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
    const token = localStorage.getItem('ludarium_token');
    if (!token) {
        alert('Precisa de estar autenticado!');
        return;
    }

    try {
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/publicacoes/${id}/favorito`, {
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
    const token = localStorage.getItem('ludarium_token');
    if (!token) {
        alert('Precisa de estar autenticado para comentar!');
        return;
    }

    const input = document.getElementById(`comment-input-${publicacaoId}`);
    const conteudo = input.value.trim();
    if (!conteudo) return;

    const novoComentario = {
        autor: "Utilizador",
        autor_arroba: "@utilizador",
        conteudo: conteudo
    };

    try {
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/publicacoes/${publicacaoId}/comentarios`, {
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

document.addEventListener('DOMContentLoaded', carregarTudo);

async function apagarPublicacao(id) {
    const token = localStorage.getItem('ludarium_token');
    if (!token) {
        alert('Precisa de estar autenticado!');
        return;
    }

    if (!confirm('Tem certeza que deseja apagar esta publicação?')) return;

    try {
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/publicacoes/${id}`, {
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
    const token = localStorage.getItem('ludarium_token');
    if (!token) {
        alert('Precisa de estar autenticado!');
        return;
    }

    if (!confirm('Deseja apagar este comentário?')) return;

    try {
        const res = await fetch(`${COMMUNITY_SERVICE_URL}/comentarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao apagar comentário.');

        carregarPublicacoes();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}