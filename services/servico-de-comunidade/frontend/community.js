// ==========================================
// LUDARIUM - COMUNIDADE (COMMUNITY.JS COMPLETO)
// ==========================================
const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = "http://localhost:8003";
const SERVICO_DE_CAMPANHAS = SERVICO_DE_CAMPANHAS_URL;
const SERVICO_DE_PERFIL_URL = "http://localhost:8004";
const GATEWAY_URL = "http://localhost:8005"; // API Gateway centralizador

let listaPublicacoesGlobal = [];
let listaForunsGlobal = [];
let listaGruposGlobal = [];
let listaCandidatosGestaoGlobal = [];
let listaGruposProducaoGlobal = [];
let publicacaoSelecionadaIdGlobal = null;
let publicacaoSelecionadaTituloGlobal = "Procuramos desenvolvedores Kotlin";

let forumAtualId = null;
let forumIdParaDenunciar = null;
let imagemBase64Evidencia = null;
let temporizadorContagemRegressiva = null;
let candidaturaChatAtualId = null;
let grupoChatAtualId = null; // ID dedicado para chat de grupos/equipas

/**
 * Exibe uma notificação Toast flutuante elegante no canto inferior direito
 */
function mostrarToast(mensagem, tipo = 'sucesso') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const corFundo = tipo === 'sucesso' ? '#7c3aed' : '#ef4444';
    
    toast.style.cssText = `background: ${corFundo}; color: #fff; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); font-size: 0.9rem; font-weight: 500; opacity: 0; transition: opacity 0.3s ease; border: 1px solid rgba(255,255,255,0.2);`;
    toast.textContent = mensagem;
    
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; }, 50);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Função blindada para obter o token de autenticação
function obterToken() {
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token');

    if (token) {
        localStorage.setItem('ludarium_token', token);
    } else {
        token = localStorage.getItem('ludarium_token');
    }

    if (!token) {
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMSIsImV4cCI6MTc5Mjg3NTk3Nn0.8Kiajoqmtvmdt6ypcfUOGLwSEIPXmRC7ZNgU0_zpvNI";
        localStorage.setItem('ludarium_token', token);
    }

    return token;
}

// Extrair o nome do utilizador a partir do token JWT
function obterUtilizadorAtualNome() {
    const token = obterToken();
    if (!token) return "user1";
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);
        const email = payload.sub || payload.email;
        return email ? email.split('@')[0] : "user1";
    } catch (e) {
        return "user1";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const linksMenu = document.querySelectorAll('.nav-links a');
    linksMenu.forEach(link => {
        link.addEventListener('click', (e) => {
            const token = localStorage.getItem('ludarium_token');
            if (token) {
                e.preventDefault();
                try {
                    const urlDestino = new URL(link.href);
                    urlDestino.searchParams.set('token', token);
                    window.location.href = urlDestino.toString();
                } catch (err) {
                    window.location.href = link.href;
                }
            }
        });
    });

    window.addEventListener('click', () => {
        document.querySelectorAll('[id^="menu-dropdown-"]').forEach(menu => menu.style.display = 'none');
    });

    carregarTudo();
});

async function carregarTudo() {
    await carregarPublicacoes();
    await carregarOportunidades();
    await carregarPerfis();
    await carregarForuns();
    await carregarGruposPrivados();
    await carregarGestaoCandidatosEGrupos();
}

async function carregarPublicacoes() {
    const loadingEl = document.getElementById('loading');
    const utilizadorAtual = obterUtilizadorAtualNome();

    try {
        const response = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/publicacoes`);
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

    if (!Array.isArray(publicacoes) || publicacoes.length === 0) {
        gridEl.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 2rem;">Nenhuma publicação encontrada.</p>';
        return;
    }

    publicacoes.forEach(pub => {
        const card = document.createElement('div');
        card.className = 'community-card';
        card.style.cssText = "background: #181b28; border: 1px solid #2a2e43; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;";
        
        const ehDonoPub = utilizadorAtual && pub.autor && pub.autor.toLowerCase() === utilizadorAtual.toLowerCase();
        
        const botoesPubHtml = ehDonoPub ? `
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button onclick="selecionarPublicacaoParaGestao(${pub.id}, '${pub.titulo.replace(/'/g, "\\'")}')" style="background: #7c3aed; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" title="Ver Candidatos desta Vaga">👥 Ver Candidatos</button>
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
            <div class="stats" style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;">👥 Interessados: <span id="interessados-qtd-${pub.id}">${pub.interessados_qtd || 0}</span> | 👍 Votos: ${pub.votos || 0}</div>
            
            <div class="card-footer" style="border-top: 1px solid #2a2e43; padding-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn-primary" onclick="participarCampanha(${pub.id}, '${pub.titulo.replace(/'/g, "\\'")}', '${pub.autor || 'Autor'}')" style="background: #0d9488; font-size: 0.8rem; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; color: white;">Quero Participar</button>
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

async function selecionarPublicacaoParaGestao(pubId, pubTitulo) {
    publicacaoSelecionadaIdGlobal = pubId;
    publicacaoSelecionadaTituloGlobal = pubTitulo;
    
    localStorage.setItem('ludarium_pub_selecionada_id', pubId);
    localStorage.setItem('ludarium_pub_selecionada_titulo', pubTitulo);
    
    const tituloEl = document.getElementById('titulo-campanha-ativa');
    if (tituloEl) {
        tituloEl.textContent = `Gerenciamento de Candidatos: ${pubTitulo}`;
    }
    
    await carregarGestaoCandidatosEGrupos();
    mostrarToast(`Painel alterado para a vaga: "${pubTitulo}"`);
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
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/publicacoes/${id}/votar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao registar voto.');
        carregarPublicacoes();
        mostrarToast('Voto registado com sucesso!');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

async function participarCampanha(pubId, pubTitulo, autorPub) {
    publicacaoSelecionadaIdGlobal = pubId;
    publicacaoSelecionadaTituloGlobal = pubTitulo;
    
    localStorage.setItem('ludarium_pub_selecionada_id', pubId);
    localStorage.setItem('ludarium_pub_selecionada_titulo', pubTitulo);

    const token = obterToken();

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/publicacoes/${pubId}/participar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Erro ao participar.');
        }

        const pubAtualizada = await res.json();
        const index = listaPublicacoesGlobal.findIndex(p => p.id === pubId);
        if (index !== -1) {
            listaPublicacoesGlobal[index] = pubAtualizada;
        }

        const spanContador = document.getElementById(`interessados-qtd-${pubId}`);
        if (spanContador) spanContador.textContent = pubAtualizada.interessados_qtd;

        const tituloEl = document.getElementById('titulo-campanha-ativa');
        if (tituloEl) {
            tituloEl.textContent = `Gerenciamento de Candidatos: ${pubTitulo}`;
        }

        await carregarGestaoCandidatosEGrupos();
        mostrarToast(`Inscrição efetuada com sucesso em "${pubTitulo}"!`);
    } catch (e) {
        mostrarToast('Erro ao participar: ' + e.message, 'erro');
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
    const tagsArray = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
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
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/publicacoes/${id}`, {
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
        mostrarToast('Publicação atualizada com sucesso!');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

async function carregarOportunidades() {
    const container = document.getElementById('oportunidades-list');
    if (!container) return;
    try {
        const res = await fetch(`${GATEWAY_URL}/oportunidades`);
        if (res.ok) {
            const ops = await res.json();
            container.innerHTML = ops.map(o => `
                <div class="sidebar-item" style="margin-bottom: 0.75rem; border-bottom: 1px solid #2a2e43; padding-bottom: 0.5rem;">
                    <strong style="color: white; font-size: 0.9rem;">${o.titulo}</strong><br>
                    <span style="font-size:0.8rem; color:#9ca3af;">${o.contexto || ''}</span>
                </div>
            `).join('');
            return;
        }
    } catch (e) {}
    
    container.innerHTML = `
        <div class="sidebar-item" style="margin-bottom: 0.75rem; border-bottom: 1px solid #2a2e43; padding-bottom: 0.5rem;">
            <strong style="color: white; font-size: 0.9rem;">Desenvolvedor Kotlin / Spring</strong><br>
            <span style="font-size:0.8rem; color:#9ca3af;">Backend Architecture</span>
        </div>
    `;
}

async function carregarPerfis() {
    const container = document.getElementById('perfis-list');
    if (!container) return;
    try {
        const res = await fetch(`${GATEWAY_URL}/recomendados/skills`);
        if (res.ok) {
            const perfis = await res.json();
            container.innerHTML = perfis.map(p => `
                <div class="sidebar-item" style="margin-bottom: 0.75rem; border-bottom: 1px solid #2a2e43; padding-bottom: 0.5rem;">
                    <strong style="color: white; font-size: 0.9rem;">${p.nome}</strong> (${p.compatibilidade_porcentagem}% match)<br>
                    <span style="font-size:0.8rem; color:#9ca3af;">${p.papel || ''}</span>
                </div>
            `).join('');
            return;
        }
    } catch (e) {}

    container.innerHTML = `
        <div class="sidebar-item" style="margin-bottom: 0.75rem; border-bottom: 1px solid #2a2e43; padding-bottom: 0.5rem;">
            <strong style="color: white; font-size: 0.9rem;">Utilizador 1</strong> (95% match)<br>
            <span style="font-size:0.8rem; color:#9ca3af;">Backend Developer</span>
        </div>
    `;
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
    const submitBtn = document.querySelector('#form-nova-pub button[type="submit"]');

    const tagsInput = document.getElementById('pub-tags').value;
    const tagsArray = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
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

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'A publicar...';
    }

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/publicacoes`, {
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
        mostrarToast('Publicação criada com sucesso! 🎉');
    } catch (error) {
        mostrarToast('Erro: ' + error.message, 'erro');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Publicar';
        }
    }
}

async function alternarFavorito(id) {
    const token = obterToken();
    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/publicacoes/${id}/favorito`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao favoritar.');
        carregarPublicacoes();
        mostrarToast('Estado de favorito atualizado!');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
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
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/publicacoes/${publicacaoId}/comentarios`, {
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
        mostrarToast('Comentário enviado!');
    } catch (error) {
        mostrarToast('Erro: ' + error.message, 'erro');
    }
}

async function apagarPublicacao(id) {
    const token = obterToken();
    if (!confirm('Tem certeza que deseja apagar esta publicação?')) return;

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/publicacoes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao apagar publicação.');
        carregarPublicacoes();
        mostrarToast('Publicação apagada.');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

async function apagarComentario(id) {
    const token = obterToken();
    if (!confirm('Deseja apagar este comentário?')) return;

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/comentarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao apagar comentário.');
        carregarPublicacoes();
        mostrarToast('Comentário apagado.');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

// ==========================================
// GESTÃO DE FÓRUNS PÚBLICOS E CHAT DIRETO
// ==========================================

function abrirModalForum() {
    document.getElementById('modal-forum').style.display = 'flex';
}

function fecharModalForum() {
    document.getElementById('modal-forum').style.display = 'none';
}

async function criarForum(event) {
    event.preventDefault();
    const token = obterToken();
    const dados = {
        titulo: document.getElementById('forum-titulo').value,
        categoria: document.getElementById('forum-categoria').value,
        descricao: document.getElementById('forum-descricao').value
    };

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/foruns`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        if (!res.ok) throw new Error('Falha ao criar fórum.');

        fecharModalForum();
        document.getElementById('form-novo-forum').reset();
        carregarForuns();
        mostrarToast('Fórum criado com sucesso!');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

async function carregarForuns() {
    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/foruns`);
        if (!res.ok) throw new Error('Erro ao carregar fóruns.');
        listaForunsGlobal = await res.json();
        renderizarForunsSidebar(listaForunsGlobal);
        
        if (listaForunsGlobal.length > 0 && !forumAtualId) {
            selecionarForum(listaForunsGlobal[0].id);
        }
    } catch (e) {}
}

function renderizarForunsSidebar(foruns) {
    const sidebar = document.getElementById('lista-foruns-sidebar');
    if (!sidebar) return;
    sidebar.innerHTML = '';

    if (!Array.isArray(foruns) || foruns.length === 0) {
        sidebar.innerHTML = '<span style="color: #94a3b8; font-size: 0.85rem;">Nenhum fórum encontrado.</span>';
        return;
    }

    foruns.forEach(f => {
        const item = document.createElement('div');
        item.style.cssText = `position: relative; padding: 12px; border-radius: 8px; cursor: pointer; background: ${forumAtualId === f.id ? '#252b42' : '#121520'}; border: 1px solid ${forumAtualId === f.id ? '#7c3aed' : '#2a2e43'}; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;`;
        
        item.innerHTML = `
            <div onclick="selecionarForum(${f.id})" style="flex: 1;">
                <div style="font-weight: bold; color: white; font-size: 0.95rem;">💬 ${f.titulo} ${f.is_suspended === 1 ? '🚫' : ''}</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">${f.categoria}</div>
            </div>
            <div style="position: relative;">
                <button onclick="toggleMenuForum(event, ${f.id})" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; padding: 0 4px;" title="Opções">⋮</button>
                
                <div id="menu-dropdown-${f.id}" style="display: none; position: absolute; right: 0; top: 25px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 50; width: 130px;">
                    <button onclick="abrirModalDenunciaCard(event, ${f.id})" style="width: 100%; text-align: left; background: none; border: none; color: #f87171; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                        ⚠️ Denunciar
                    </button>
                </div>
            </div>
        `;
        sidebar.appendChild(item);
    });
}

function toggleMenuForum(event, forumId) {
    event.stopPropagation();
    document.querySelectorAll('[id^="menu-dropdown-"]').forEach(menu => {
        if (menu.id !== `menu-dropdown-${forumId}`) menu.style.display = 'none';
    });

    const menu = document.getElementById(`menu-dropdown-${forumId}`);
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function abrirModalDenunciaCard(event, forumId) {
    event.stopPropagation();
    forumIdParaDenunciar = forumId;
    let modal = document.getElementById('modal-denuncia');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        criarModalDenunciaDinamico();
        document.getElementById('modal-denuncia').style.display = 'flex';
    }
}

function criarModalDenunciaDinamico() {
    if (document.getElementById('modal-denuncia')) return;
    const modalHtml = `
    <div id="modal-denuncia" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); justify-content: center; align-items: center; z-index: 1100;">
        <div class="modal-content" style="background: #1e293b; padding: 2rem; border-radius: 12px; width: 480px; border: 1px solid #334155;">
            <span class="close" onclick="fecharModalDenuncia()" style="float: right; cursor: pointer; font-size: 1.5rem; color: #94a3b8;">&times;</span>
            <h2 style="margin-top: 0; margin-bottom: 1rem; color: white; font-size: 1.25rem;">⚠️ Denunciar Fórum</h2>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 1rem;">Descreva detalhadamente o problema e anexe uma captura de tela (print) se necessário.</p>
            
            <form id="form-denuncia-forum" onsubmit="enviarDenunciaForumComEvidencia(event)" style="display: flex; flex-direction: column; gap: 1rem;">
                <textarea id="motivo-denuncia" placeholder="Relate o motivo da denúncia..." rows="4" required style="padding: 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: white; resize: vertical;"></textarea>
                
                <div>
                    <label style="color: #cbd5e1; font-size: 0.85rem; display: block; margin-bottom: 4px;">Anexar Print / Imagem de Evidência:</label>
                    <input type="file" id="input-evidencia-arquivo" accept="image/*" onchange="converterImagemBase64(this)" style="color: #94a3b8; font-size: 0.85rem;">
                </div>

                <div id="preview-container" style="display: none; margin-top: 5px;">
                    <img id="img-preview" src="" alt="Pré-visualização" style="max-height: 100px; border-radius: 4px; border: 1px solid #475569;">
                </div>

                <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem;">
                    <button type="button" onclick="fecharModalDenuncia()" style="background: #334155; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
                    <button type="submit" style="background: #dc2626; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">Enviar Denúncia</button>
                </div>
            </form>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function fecharModalDenuncia() {
    const modal = document.getElementById('modal-denuncia');
    if (modal) modal.style.display = 'none';
    const motivoInput = document.getElementById('motivo-denuncia');
    if (motivoInput) motivoInput.value = '';
    const fileInput = document.getElementById('input-evidencia-arquivo');
    if (fileInput) fileInput.value = '';
    const previewContainer = document.getElementById('preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
    imagemBase64Evidencia = null;
    forumIdParaDenunciar = null;
}

function converterImagemBase64(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagemBase64Evidencia = e.target.result;
            const imgPreview = document.getElementById('img-preview');
            if (imgPreview) imgPreview.src = imagemBase64Evidencia;
            const previewContainer = document.getElementById('preview-container');
            if (previewContainer) previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function enviarDenunciaForumComEvidencia(event) {
    event.preventDefault();
    const motivoEl = document.getElementById('motivo-denuncia');
    if (!motivoEl) return;
    const motivo = motivoEl.value.trim();
    if (!motivo || !forumIdParaDenunciar) return;

    const token = obterToken();

    try {
        const response = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/foruns/${forumIdParaDenunciar}/denunciar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                motivo: motivo,
                evidencia: imagemBase64Evidencia || null
            })
        });

        if (response.ok) {
            mostrarToast("Denúncia enviada com sucesso para a moderação!");
            fecharModalDenuncia();
        } else {
            const err = await response.json();
            mostrarToast(`Erro: ${err.detail || 'Não foi possível enviar a denúncia.'}`, 'erro');
        }
    } catch (error) {
        mostrarToast("Erro de comunicação com o servidor.", 'erro');
    }
}

async function selecionarForum(forumId) {
    forumAtualId = forumId;
    renderizarForunsSidebar(listaForunsGlobal);

    const forum = listaForunsGlobal.find(f => f.id === forumId);
    if (!forum) return;

    const tituloEl = document.getElementById('forum-ativo-titulo');
    if (tituloEl) tituloEl.textContent = forum.titulo;
    const descEl = document.getElementById('forum-ativo-desc');
    if (descEl) descEl.textContent = forum.descricao;
    
    const utilizadorAtual = obterUtilizadorAtualNome();
    const isAdmin = utilizadorAtual && (utilizadorAtual.toLowerCase().includes('admin') || utilizadorAtual.toLowerCase() === 'admin');
    const isCreator = forum.creator_email && utilizadorAtual && forum.creator_email.toLowerCase().includes(utilizadorAtual.toLowerCase());
    
    const acoesAdmin = document.getElementById('forum-acoes-admin');
    const inputArea = document.getElementById('forum-chat-input-area');
    const msgContainer = document.getElementById('forum-mensagens-container');
    const subtitulo = document.getElementById('forum-chat-subtitulo');
    const painelMembros = document.getElementById('lista-topicos-forum');

    const isBanido = forum.is_suspended === 1;

    if (temporizadorContagemRegressiva) {
        clearInterval(temporizadorContagemRegressiva);
        temporizadorContagemRegressiva = null;
    }

    if (acoesAdmin) {
        if (isAdmin) {
            acoesAdmin.innerHTML = `
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="apagarForum(${forum.id})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold;" title="Apagar Fórum">🗑️ Apagar Fórum</button>
                    ${!isBanido ? `<button onclick="suspenderForumAdmin(${forum.id})" style="background: #b91c1c; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold;" title="Suspender/Banir Fórum">🛡️ Suspender Fórum</button>` : '<span style="background: #7f1d1d; color: #fca5a5; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;">🚫 Fórum Suspenso</span>'}
                </div>
            `;
        } else if (isCreator && !isBanido) {
            acoesAdmin.innerHTML = `
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="apagarForum(${forum.id})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold;" title="Apagar Fórum">🗑️ Apagar Fórum</button>
                </div>
            `;
        } else {
            acoesAdmin.innerHTML = '';
        }
    }

    if (subtitulo) subtitulo.textContent = `Chat ao vivo: ${forum.titulo}`;

    if (isBanido) {
        if (msgContainer) {
            msgContainer.innerHTML = `
                <div style="background: rgba(185, 28, 28, 0.2); border: 1px solid #b91c1c; padding: 1.5rem; border-radius: 8px; color: #fca5a5; text-align: center; max-width: 90%; margin: 2rem auto;">
                    <h3 style="margin-top: 0; color: #f87171;">⚠️ Fórum Suspenso / Banido</h3>
                    <p style="font-size: 0.95rem; margin-bottom: 0.5rem;"><strong>Motivo da Suspensão:</strong></p>
                    <p style="font-style: italic; color: #fff; margin-bottom: 1rem;">"${forum.suspend_reason || 'Violação das diretrizes da comunidade.'}"</p>
                    <div id="countdown-timer" style="font-size: 1rem; font-weight: bold; color: #fbbf24; margin-top: 10px;">⏳ A calcular tempo restante...</div>
                    <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 1rem;">Este fórum encontra-se visível apenas para consulta. Novas mensagens estão bloqueadas.</p>
                </div>
            `;

            if (forum.suspended_until) {
                iniciarContagemRegressivaForum(forum.suspended_until, 'countdown-timer');
            } else {
                document.getElementById('countdown-timer').textContent = "⏳ Suspensão permanente ou sem prazo definido.";
            }
        }
        if (inputArea) inputArea.style.display = 'none';
        if (painelMembros) painelMembros.innerHTML = '<span style="color: #ef4444; font-size: 0.85rem;">Interações suspensas.</span>';
        return;
    }

    if (inputArea) inputArea.style.display = 'flex';
    await carregarMembrosForum(forumId);
    await carregarMensagensForum(forumId);
}

function iniciarContagemRegressivaForum(dataIsoExpiracao, elementoId) {
    const el = document.getElementById(elementoId);
    if (!el) return;

    const targetTime = new Date(dataIsoExpiracao).getTime();

    temporizadorContagemRegressiva = setInterval(() => {
        const now = new Date().getTime();
        const diff = targetTime - now;

        if (diff <= 0) {
            clearInterval(temporizadorContagemRegressiva);
            el.innerHTML = "⚠️ O prazo de suspensão expirou. A atualizar fórum...";
            setTimeout(() => carregarForuns(), 2000);
            return;
        }

        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);

        let tempoTexto = "⏳ Liberação em: ";
        if (dias > 0) tempoTexto += `${dias}d `;
        tempoTexto += `${horas}h ${minutos}m ${segundos}s`;

        el.innerHTML = tempoTexto;
    }, 1000);
}

async function carregarMembrosForum(forumId) {
    const container = document.getElementById('lista-topicos-forum');
    if (!container) return;

    const labelHeader = document.querySelector('h4#label-painel-lateral') || document.querySelector('.forum-sidebar-section h4');
    if (labelHeader) labelHeader.textContent = '🟢 Membros Online';

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/foruns/${forumId}/membros`);
        const membros = await res.json();

        if (!membros || membros.length === 0) {
            container.innerHTML = '<span style="color: #64748b; font-size: 0.85rem;">Nenhum membro ativo visível.</span>';
            return;
        }

        container.innerHTML = membros.map(m => `
            <div style="background: #121520; border: 1px solid #2a2e43; padding: 8px 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; background: #22c55e; border-radius: 50%;"></div>
                    <strong style="color: white; font-size: 0.85rem;">${m.nome}</strong>
                </div>
                <span style="font-size: 0.7rem; color: #94a3b8;">${m.status || 'Online'}</span>
            </div>
        `).join('');
    } catch (e) {}
}

async function carregarMensagensForum(forumId) {
    const container = document.getElementById('forum-mensagens-container');
    const meuNome = obterUtilizadorAtualNome();
    if (!container) return;

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/foruns/${forumId}/mensagens`);
        const mensagens = await res.json();

        if (mensagens.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 2rem;">Ainda não há mensagens neste fórum. Seja o primeiro a enviar!</p>';
            return;
        }

        container.innerHTML = mensagens.map(m => {
            const meu = meuNome && m.autor.toLowerCase() === meuNome.toLowerCase();
            return `
                <div style="max-width: 75%; align-self: ${meu ? 'flex-end' : 'flex-start'}; background: ${meu ? '#7c3aed' : '#334155'}; color: white; padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; margin-bottom: 0.5rem;">
                    <div style="font-size: 0.75rem; color: #cbd5e1; margin-bottom: 2px; font-weight: bold;">${m.autor}</div>
                    <div>${m.conteudo}</div>
                </div>
            `;
        }).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) {}
}

async function enviarMensagemForumAtivo() {
    if (!forumAtualId) return;
    const forum = listaForunsGlobal.find(f => f.id === forumAtualId);
    if (forum && forum.is_suspended === 1) {
        mostrarToast('Fórum suspenso. Envio de mensagens bloqueado.', 'erro');
        return;
    }

    const token = obterToken();
    const input = document.getElementById('input-mensagem-forum');
    if (!input) return;
    const conteudo = input.value.trim();
    if (!conteudo) return;

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/foruns/${forumAtualId}/mensagens`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ conteudo })
        });
        if (!res.ok) throw new Error('Falha ao enviar mensagem.');

        input.value = '';
        carregarMensagensForum(forumAtualId);
        carregarMembrosForum(forumAtualId);
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

function verificarEnterForum(event) {
    if (event.key === 'Enter') {
        enviarMensagemForumAtivo();
    }
}

async function apagarForum(forumId) {
    if (!confirm('Tem a certeza que deseja apagar este fórum?')) return;
    const token = obterToken();

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/foruns/${forumId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Falha ao apagar o fórum.');
        }

        forumAtualId = null;
        carregarForuns();
        mostrarToast('Fórum apagado com sucesso!');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

async function suspenderForumAdmin(forumId) {
    const inputHoras = prompt('Digite o período de suspensão em horas (Ex: 72 para 72 horas):', '72');
    if (inputHoras === null) return;

    const horas = parseInt(inputHoras);
    if (isNaN(horas) || horas <= 0) {
        mostrarToast('Por favor, insira um número válido de horas.', 'erro');
        return;
    }

    const motivo = prompt('Digite o motivo do banimento/suspensão deste fórum:');
    if (motivo === null) return;
    if (!motivo.trim()) {
        mostrarToast('O motivo da suspensão é obrigatório.', 'erro');
        return;
    }

    const suspendedUntil = new Date(new Date().getTime() + horas * 60 * 60 * 1000).toISOString();
    const token = obterToken();

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/admin/foruns/${forumId}/suspender`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                motivo: motivo.trim(),
                suspended_until: suspendedUntil,
                horas_suspensao: horas
            })
        });
        if (!res.ok) throw new Error('Falha ao suspender o fórum.');

        forumAtualId = forumId;
        await carregarForuns();
        selecionarForum(forumId);
        mostrarToast(`Fórum suspenso por ${horas} horas com sucesso!`);
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

// ==========================================
// GESTÃO DE CANDIDATOS E CHAT DE EQUIPAS
// ==========================================

async function carregarGestaoCandidatosEGrupos() {
    const token = obterToken();
    try {
        if (!publicacaoSelecionadaIdGlobal) {
            const pubSalva = localStorage.getItem('ludarium_pub_selecionada_id');
            const titSalvo = localStorage.getItem('ludarium_pub_selecionada_titulo');
            if (pubSalva) {
                publicacaoSelecionadaIdGlobal = parseInt(pubSalva);
                publicacaoSelecionadaTituloGlobal = titSalvo || "Vaga Selecionada";
            } else if (typeof listaPublicacoesGlobal !== 'undefined' && listaPublicacoesGlobal.length > 0) {
                const primeiraPub = listaPublicacoesGlobal[0];
                publicacaoSelecionadaIdGlobal = primeiraPub.id;
                publicacaoSelecionadaTituloGlobal = primeiraPub.titulo;
            }
        }

        const tituloEl = document.getElementById('titulo-campanha-ativa');
        if (tituloEl) {
            tituloEl.textContent = `Gerenciamento de Candidatos: ${publicacaoSelecionadaTituloGlobal || 'Selecione uma vaga'}`;
        }

        if (publicacaoSelecionadaIdGlobal) {
            const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/publicacoes/${publicacaoSelecionadaIdGlobal}/candidatos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const dadosServidor = await res.json();
                listaCandidatosGestaoGlobal = Array.isArray(dadosServidor) ? dadosServidor : [];
            } else if (res.status === 404) {
                localStorage.removeItem('ludarium_pub_selecionada_id');
                localStorage.removeItem('ludarium_pub_selecionada_titulo');
                publicacaoSelecionadaIdGlobal = null;
                publicacaoSelecionadaTituloGlobal = "";
                listaCandidatosGestaoGlobal = [];
            } else {
                listaCandidatosGestaoGlobal = [];
            }
        } else {
            listaCandidatosGestaoGlobal = [];
        }
    } catch (e) {
        listaCandidatosGestaoGlobal = [];
    }

    if (!Array.isArray(listaCandidatosGestaoGlobal)) {
        listaCandidatosGestaoGlobal = [];
    }

    if (typeof renderizarCandidatosGestao === 'function') {
        renderizarCandidatosGestao(listaCandidatosGestaoGlobal);
    }

    try {
        const resGrupos = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/grupos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resGrupos.ok) {
            listaGruposProducaoGlobal = await resGrupos.json();
            if (typeof renderizarGruposProducao === 'function') {
                renderizarGruposProducao(listaGruposProducaoGlobal);
            }
        } else {
            if (typeof renderizarGruposProducao === 'function') {
                renderizarGruposProducao([]);
            }
        }
    } catch (e) {
        if (typeof renderizarGruposProducao === 'function') {
            renderizarGruposProducao([]);
        }
    }
}

function renderizarCandidatosGestao(candidatos) {
    const container = document.getElementById('lista-candidatos-gestao');
    const contador = document.getElementById('contador-candidatos-titulo');
    if (!container) return;

    container.innerHTML = '';
    if (contador) contador.textContent = `Candidatos (${candidatos.length})`;

    if (candidatos.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem; text-align: center; padding: 2rem;">Nenhum candidato inscrito ainda.</p>';
        return;
    }

    const utilizadorAtual = obterUtilizadorAtualNome().toLowerCase();

    candidatos.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = "background: #121520; border: 1px solid #2a2e43; padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px;";
        
        const chatLiberadoNum = Number(c.chat_liberado || 0);
        const escapeNome = (c.nome || 'Utilizador').replace(/'/g, "\\'");
        const escapeUsername = (c.username || '@user').replace(/'/g, "\\'");

        // Identifica se quem está a ver é o próprio candidato deste card
        const ehProprioCandidato = utilizadorAtual === (c.username || '').toLowerCase().replace('@', '') || utilizadorAtual === (c.user_email || '').split('@')[0].toLowerCase();
        
        let acoesDireita = '';
        const botaoChatHtml = `<button onclick="abrirChatCandidatura('${escapeNome}', '${escapeUsername}', ${c.id}, ${chatLiberadoNum})" style="background: #0d9488; color: white; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem;" title="Chat direto">💬 Chat</button>`;

        if (ehProprioCandidato) {
            // Se for o candidato: vê o status atual e a opção de apagar a candidatura/conversa
            let statusBadge = `<span style="color: #94a3b8; font-size: 0.75rem;">Pendente</span>`;
            if (c.status === 'aprovado') statusBadge = `<span style="color: #22c55e; font-size: 0.75rem; font-weight: bold;">✔ Aprovado</span>`;
            if (c.status === 'reprovado') statusBadge = `<span style="color: #ef4444; font-size: 0.75rem; font-weight: bold;">✖ Reprovado</span>`;

            const chatOuBloqueio = chatLiberadoNum === 1 
                ? botaoChatHtml 
                : `<span style="color: #94a3b8; font-size: 0.75rem; font-style: italic;">🔒 Aguardando contacto</span>`;

            acoesDireita = `
                ${statusBadge}
                ${chatOuBloqueio}
                <button onclick="apagarCandidatoGestao(${c.id})" style="background: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem;" title="Apagar candidatura e conversa">🗑️ Apagar</button>
            `;
        } else {
            // Se for o recrutador: vê os botões de aprovar, reprovar, chat e apagar
            if (c.status === 'aprovado') {
                acoesDireita = `<span style="color: #22c55e; font-size: 0.75rem; font-weight: bold;">✔ Aprovado</span> ${botaoChatHtml} <button onclick="apagarCandidatoGestao(${c.id})" style="background: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem;" title="Apagar Candidato">🗑️</button>`;
            } else if (c.status === 'reprovado') {
                acoesDireita = `<span style="color: #ef4444; font-size: 0.75rem; font-weight: bold;">✖ Reprovado</span> <button onclick="apagarCandidatoGestao(${c.id})" style="background: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem;" title="Apagar Candidato">🗑️</button>`;
            } else {
                acoesDireita = `
                    <button onclick="mudarStatusCandidato(${c.id}, 'aprovado')" style="background: #16a34a; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: bold;" title="Aprovar">✔</button>
                    <button onclick="mudarStatusCandidato(${c.id}, 'reprovado')" style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: bold;" title="Reprovar">✖</button>
                    ${botaoChatHtml}
                    <button onclick="apagarCandidatoGestao(${c.id})" style="background: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem;" title="Apagar Candidato">🗑️</button>
                `;
            }
        }

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; overflow: hidden;">
                <div style="width: 36px; height: 36px; background: #7c3aed; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; flex-shrink: 0;">${c.avatar || 'U'}</div>
                <div style="overflow: hidden;">
                    <div style="color: white; font-size: 0.9rem; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.nome} (${c.username})</div>
                    <div style="color: #94a3b8; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.papel || 'Candidato'}</div>
                </div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                ${acoesDireita}
            </div>
        `;
        container.appendChild(item);
    });
}
function filtrarCandidatosGestao() {
    const inputBusca = document.getElementById('input-busca-candidatos');
    if (!inputBusca) return;
    const termo = inputBusca.value.toLowerCase().trim();
    
    const filtrados = listaCandidatosGestaoGlobal.filter(c => 
        c.nome.toLowerCase().includes(termo) || 
        c.username.toLowerCase().includes(termo) || 
        (c.papel && c.papel.toLowerCase().includes(termo))
    );
    
    renderizarCandidatosGestao(filtrados);
}

async function mudarStatusCandidato(id, status) {
    const token = obterToken();
    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/candidatos/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!res.ok) throw new Error('Falha ao atualizar status do candidato.');

        const cand = listaCandidatosGestaoGlobal.find(c => c.id === id);
        if (cand) {
            cand.status = status;
            renderizarCandidatosGestao(listaCandidatosGestaoGlobal);
            mostrarToast(`Candidato ${cand.nome} foi ${status} com sucesso!`);
        }
    } catch (e) {
        const cand = listaCandidatosGestaoGlobal.find(c => c.id === id);
        if (cand) {
            cand.status = status;
            renderizarCandidatosGestao(listaCandidatosGestaoGlobal);
            mostrarToast(`Candidato ${cand.nome} foi ${status} com sucesso!`);
        }
    }
}

async function apagarCandidatoGestao(id) {
    const token = obterToken();
    if (!confirm('Tem certeza que deseja apagar este candidato?')) return;

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/candidatos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao apagar candidato do servidor.');

        listaCandidatosGestaoGlobal = listaCandidatosGestaoGlobal.filter(c => c.id !== id);
        renderizarCandidatosGestao(listaCandidatosGestaoGlobal);
        mostrarToast('Card do candidato removido com sucesso.');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

// ==========================================
// FUNÇÕES SEPARADAS DE CHAT (ENGENHARIA LIMPA)
// ==========================================

// 1. CHAT DE CANDIDATURAS (Isolado)
async function abrirChatCandidatura(nome, username, candidaturaId, chatLiberado = 0) {
    const utilizadorAtual = obterUtilizadorAtualNome().toLowerCase();
    
    // Se o nome do utilizador logado corresponder ao username do candidato, ele é o candidato (e não o recrutador)
    const ehCandidato = utilizadorAtual === username.toLowerCase().replace('@', '');

    // Se for o candidato e o chat ainda não foi liberado (chatLiberado !== 1), impede a abertura
    if (ehCandidato && Number(chatLiberado) !== 1) {
        mostrarToast("O chat de candidatura estará disponível assim que o recrutador iniciar o contacto.", "erro");
        return;
    }

    candidaturaChatAtualId = candidaturaId;
    grupoChatAtualId = null; 
    
    const nomeEl = document.getElementById('chat-wa-nome');
    const avatarEl = document.getElementById('chat-wa-avatar');
    const modalEl = document.getElementById('modal-chat-whatsapp');

    if (nomeEl) nomeEl.textContent = `${nome} (${username}) - Vaga`;
    if (avatarEl) avatarEl.textContent = nome.charAt(0).toUpperCase();
    if (modalEl) modalEl.style.display = 'flex';

    await carregarMensagensCandidaturaEspecifico();
}

async function carregarMensagensCandidaturaEspecifico() {
    if (!candidaturaChatAtualId) return;
    const token = obterToken();
    const container = document.getElementById('chat-wa-mensagens');
    const meuNome = obterUtilizadorAtualNome();
    if (!container) return;

    container.innerHTML = '<span style="color: #94a3b8; font-size: 0.85rem; text-align: center;">A carregar mensagens...</span>';

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/candidaturas/${candidaturaChatAtualId}/mensagens`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao carregar mensagens da candidatura.');

        const mensagens = await res.json();
        if (!Array.isArray(mensagens) || mensagens.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 1rem; font-size: 0.85rem;">Inicie a conversa da candidatura enviando uma mensagem abaixo.</p>';
            return;
        }

        container.innerHTML = mensagens.map(m => {
            const meu = meuNome && m.autor.toLowerCase() === meuNome.toLowerCase();
            return `
                <div style="max-width: 75%; align-self: ${meu ? 'flex-end' : 'flex-start'}; background: ${meu ? '#7c3aed' : '#334155'}; color: white; padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; margin-bottom: 0.5rem;">
                    <div style="font-size: 0.7rem; color: #cbd5e1; font-weight: bold; margin-bottom: 2px;">${m.autor}</div>
                    <div>${m.conteudo}</div>
                </div>
            `;
        }).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 1rem; font-size: 0.85rem;">Inicie a conversa enviando a primeira mensagem abaixo.</p>';
    }
}

async function enviarMensagemChatCandidatura() {
    if (!candidaturaChatAtualId) return;
    const token = obterToken();
    const input = document.getElementById('chat-wa-input');
    if (!input) return;
    const conteudo = input.value.trim();
    if (!conteudo) return;

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/candidaturas/${candidaturaChatAtualId}/mensagens`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ conteudo })
        });

        if (!res.ok) throw new Error('Falha ao enviar mensagem da candidatura.');

        input.value = '';
        await carregarMensagensCandidaturaEspecifico();
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

// 2. CHAT DE GRUPOS / EQUIPAS (Isolado)
async function abrirChatGrupoEquipa(nome, tipo, grupoId) {
    grupoChatAtualId = grupoId;
    candidaturaChatAtualId = null; // Garante limpeza do outro contexto

    const nomeEl = document.getElementById('chat-wa-nome');
    const avatarEl = document.getElementById('chat-wa-avatar');
    const modalEl = document.getElementById('modal-chat-whatsapp');

    if (nomeEl) nomeEl.textContent = `${nome} (${tipo})`;
    if (avatarEl) avatarEl.textContent = nome.charAt(0).toUpperCase();
    if (modalEl) modalEl.style.display = 'flex';

    await carregarMensagensGrupoEquipaEspecifico();
}

async function carregarMensagensGrupoEquipaEspecifico() {
    if (!grupoChatAtualId) return;
    const token = obterToken();
    const container = document.getElementById('chat-wa-mensagens');
    const meuNome = obterUtilizadorAtualNome();
    if (!container) return;

    container.innerHTML = '<span style="color: #94a3b8; font-size: 0.85rem; text-align: center;">A carregar mensagens do grupo...</span>';

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/grupos/${grupoChatAtualId}/mensagens`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao carregar mensagens do grupo.');

        const mensagens = await res.json();
        if (!Array.isArray(mensagens) || mensagens.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 1rem; font-size: 0.85rem;">Inicie a conversa no grupo enviando uma mensagem abaixo.</p>';
            return;
        }

        container.innerHTML = mensagens.map(m => {
            const meu = meuNome && m.autor.toLowerCase() === meuNome.toLowerCase();
            return `
                <div style="max-width: 75%; align-self: ${meu ? 'flex-end' : 'flex-start'}; background: ${meu ? '#7c3aed' : '#334155'}; color: white; padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; margin-bottom: 0.5rem;">
                    <div style="font-size: 0.7rem; color: #cbd5e1; font-weight: bold; margin-bottom: 2px;">${m.autor}</div>
                    <div>${m.conteudo}</div>
                </div>
            `;
        }).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 1rem; font-size: 0.85rem;">Inicie a conversa enviando a primeira mensagem abaixo.</p>';
    }
}

async function enviarMensagemChatGrupoEquipa() {
    if (!grupoChatAtualId) return;
    const token = obterToken();
    const input = document.getElementById('chat-wa-input');
    if (!input) return;
    const conteudo = input.value.trim();
    if (!conteudo) return;

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/grupos/${grupoChatAtualId}/mensagens`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ conteudo })
        });

        if (!res.ok) throw new Error('Falha ao enviar mensagem para o grupo.');

        input.value = '';
        await carregarMensagensGrupoEquipaEspecifico();
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

// Rotas unificadas do modal flutuante de chat
function fecharModalChatWhatsapp() {
    const modal = document.getElementById('modal-chat-whatsapp');
    if (modal) modal.style.display = 'none';
    candidaturaChatAtualId = null;
    grupoChatAtualId = null;
}

async function enviarMensagemChatWhatsapp() {
    if (candidaturaChatAtualId) {
        await enviarMensagemChatCandidatura();
    } else if (grupoChatAtualId) {
        await enviarMensagemChatGrupoEquipa();
    }
}

function verificarEnterChatWhatsapp(event) {
    if (event.key === 'Enter') enviarMensagemChatWhatsapp();
}

function iniciarChamadaVozModal() {
    const idRef = grupoChatAtualId || candidaturaChatAtualId || publicacaoSelecionadaIdGlobal;
    if (!idRef) {
        mostrarToast('Selecione uma equipa, chat ou vaga ativa primeiro.', 'erro');
        return;
    }
    const salaId = `ludarium-voz-${idRef}-${Math.random().toString(36).substring(2, 7)}`;
    const urlMeet = `https://meet.jit.si/${salaId}`;
    mostrarToast('📞 A iniciar canal de voz...');
    window.open(urlMeet, '_blank');
}

function iniciarVideoChamadaModal() {
    const idRef = grupoChatAtualId || candidaturaChatAtualId || publicacaoSelecionadaIdGlobal;
    if (!idRef) {
        mostrarToast('Selecione uma equipa, chat ou vaga ativa primeiro.', 'erro');
        return;
    }
    const salaId = `ludarium-video-${idRef}-${Math.random().toString(36).substring(2, 7)}`;
    const urlMeet = `https://meet.jit.si/${salaId}`;
    mostrarToast('📹 A iniciar videochamada...');
    window.open(urlMeet, '_blank');
}

// ==========================================
// GESTÃO DE CHATS PRIVADOS E EQUIPAS
// ==========================================

async function carregarGruposPrivados() {
    const token = obterToken();
    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/grupos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao carregar chats privados e equipas.');
        listaGruposGlobal = await res.json();
        renderizarGruposProducao(listaGruposGlobal);
    } catch (e) {}
}

function renderizarGruposProducao(grupos) {
    const container = document.getElementById('lista-grupos-producao');
    if (!container) return;
    
    container.innerHTML = '';

    const painelCriacaoRapida = document.createElement('div');
    painelCriacaoRapida.style.cssText = "background: #121520; border: 1px solid #2a2e43; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;";
    painelCriacaoRapida.innerHTML = `
        <h4 style="color: white; margin: 0 0 0.5rem 0; font-size: 0.9rem;">✨ Criar Novo Chat ou Equipa</h4>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <input type="text" id="novo-grupo-nome-rapido" placeholder="Nome do grupo ou chat..." style="flex: 1; min-width: 140px; background: #0f172a; border: 1px solid #2a2e43; padding: 7px 10px; border-radius: 6px; color: white; font-size: 0.8rem;" autocomplete="off">
            <select id="novo-grupo-tipo-rapido" style="background: #0f172a; border: 1px solid #2a2e43; padding: 7px; border-radius: 6px; color: white; font-size: 0.8rem;">
                <option value="grupo">Equipa</option>
                <option value="privado">Chat Privado</option>
            </select>
            <button class="btn-primary" onclick="criarGrupoRapidoInline()" style="background: #7c3aed; color: white; border: none; padding: 7px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">+ Criar</button>
        </div>
    `;
    container.appendChild(painelCriacaoRapida);

    const listaContentor = document.createElement('div');
    listaContentor.id = 'lista-grupos-cards-internos';
    listaContentor.style.cssText = "display: flex; flex-direction: column; gap: 0.8rem;";
    container.appendChild(listaContentor);

    if (!Array.isArray(grupos) || grupos.length === 0) {
        listaContentor.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 1rem; font-size: 0.85rem;">Nenhum grupo ou equipa criada ainda.</p>';
        return;
    }

    grupos.forEach(g => {
        const item = document.createElement('div');
        item.style.cssText = "background: #121520; border: 1px solid #2a2e43; padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;";
        
        const tipoBadge = g.tipo === 'grupo' ? 'EQUIPA' : 'PRIVADO';
        const corBadge = g.tipo === 'grupo' ? '#0d9488' : '#7c3aed';

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                    <span style="font-size: 1.1rem;">🚀</span>
                    <div style="overflow: hidden;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <strong style="color: white; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${g.nome}</strong>
                            <span style="background: ${corBadge}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold;">${tipoBadge}</span>
                        </div>
                        <div style="color: #94a3b8; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${g.descricao || 'Ativo'}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button onclick="abrirModalEditarTitulo(${g.id}, '${g.nome.replace(/'/g, "\\'")}')" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 0.75rem;" title="Editar Título">✏️</button>
                    <button onclick="apagarGrupo(${g.id})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 0.75rem;" title="Apagar Grupo">🗑️</button>
                </div>
            </div>

            <div style="position: relative; margin-top: 4px;">
                <div style="display: flex; gap: 4px;">
                    <input type="text" id="membro-email-${g.id}" placeholder="Pesquisar @username..." oninput="pesquisarUtilizadoresParaGrupo(this, 'resultados-busca-${g.id}')" style="background: #0f172a; border: 1px solid #2a2e43; padding: 5px 8px; border-radius: 4px; color: white; font-size: 0.75rem; flex: 1;" autocomplete="off">
                    <button class="btn-primary" onclick="adicionarMembroGrupo(${g.id})" style="background: #334155; font-size: 0.75rem; padding: 5px 8px; border: none; border-radius: 4px; cursor: pointer;">+ Convidar</button>
                </div>
                <div id="resultados-busca-${g.id}" style="display: none; position: absolute; left: 0; right: 40px; top: 30px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; z-index: 50; max-height: 120px; overflow-y: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.4);"></div>
            </div>

            <div id="membros-lista-${g.id}" style="font-size: 0.75rem; color: #94a3b8; display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
                <span style="color: #64748b;">A carregar membros...</span>
            </div>

            <div style="display: flex; gap: 4px; justify-content: flex-end; border-top: 1px solid #1e293b; padding-top: 6px; flex-wrap: wrap;">
                <button onclick="iniciarChamadaVoz(${g.id})" style="background: #334155; color: white; border: none; padding: 3px 6px; border-radius: 4px; cursor: pointer; font-size: 0.7rem;" title="Áudio">🔊 Áudio</button>
                <button onclick="iniciarVideoChamada(${g.id})" style="background: #334155; color: white; border: none; padding: 3px 6px; border-radius: 4px; cursor: pointer; font-size: 0.7rem;" title="Vídeo">📹 Vídeo</button>
                <button onclick="abrirChatGrupoEquipa('${g.nome.replace(/'/g, "\\'")}', '${tipoBadge}', ${g.id})" style="background: #0d9488; color: white; border: none; padding: 3px 6px; border-radius: 4px; cursor: pointer; font-size: 0.7rem;" title="Chat">💬 Chat</button>
            </div>
        `;
        listaContentor.appendChild(item);
        carregarMembrosDoGrupoUI(g.id);
    });
}

async function carregarMembrosDoGrupoUI(grupoId) {
    const container = document.getElementById(`membros-lista-${grupoId}`);
    if (!container) return;
    const token = obterToken();

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/grupos/${grupoId}/membros`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const membros = await res.json();

        if (membros.length === 0) {
            container.innerHTML = '<span style="color: #64748b;">Sem membros adicionados.</span>';
            return;
        }

        container.innerHTML = membros.map(m => `
            <span style="background: #1e293b; border: 1px solid #334155; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; color: #e2e8f0;">
                👤 ${m.nome} 
                <button onclick="removerMembroGrupo(${grupoId}, '${m.email}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.7rem; padding: 0;" title="Remover membro">×</button>
            </span>
        `).join('');
    } catch (e) {
        container.innerHTML = '';
    }
}

async function removerMembroGrupo(grupoId, emailMembro) {
    if (!confirm(`Deseja remover o membro ${emailMembro} deste grupo?`)) return;
    const token = obterToken();

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/grupos/${grupoId}/membros/${encodeURIComponent(emailMembro)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao remover membro.');

        mostrarToast('Membro removido com sucesso!');
        carregarMembrosDoGrupoUI(grupoId);
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

async function apagarGrupo(grupoId) {
    if (!confirm('Tem a certeza que deseja apagar este grupo/equipa?')) return;
    const token = obterToken();

    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/grupos/${grupoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao apagar o grupo.');

        carregarGruposPrivados();
        mostrarToast('Grupo apagado com sucesso!');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

async function criarGrupoRapidoInline() {
    const inputNome = document.getElementById('novo-grupo-nome-rapido');
    const selectTipo = document.getElementById('novo-grupo-tipo-rapido');
    if (!inputNome) return;

    const nome = inputNome.value.trim();
    const tipo = selectTipo ? selectTipo.value : 'grupo';

    if (!nome) {
        mostrarToast('Digite o nome do grupo ou chat.', 'erro');
        return;
    }

    const token = obterToken();
    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/grupos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome,
                descricao: `Equipa criada por ${obterUtilizadorAtualNome()}`,
                tipo: tipo,
                membros_usernames: []
            })
        });

        if (!res.ok) throw new Error('Falha ao criar grupo.');

        inputNome.value = '';
        carregarGruposPrivados();
        mostrarToast('Grupo criado com sucesso!');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

async function pesquisarUtilizadoresParaGrupo(inputEl, containerResultadosId) {
    const termo = inputEl.value.trim();
    const container = document.getElementById(containerResultadosId);
    if (!container) return;

    if (termo.length < 1) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    const token = obterToken();
    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/usuarios/buscar?q=${encodeURIComponent(termo)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const usuarios = await res.json();

        if (usuarios.length === 0) {
            container.innerHTML = '<div style="padding: 8px; color: #94a3b8; font-size: 0.8rem;">Nenhum utilizador encontrado.</div>';
            container.style.display = 'block';
            return;
        }

        container.innerHTML = usuarios.map(u => `
            <div onclick="selecionarUtilizadorParaGrupo('${u.email}', '${u.nome}', '${containerResultadosId}')" style="padding: 8px 12px; cursor: pointer; color: white; font-size: 0.85rem; border-bottom: 1px solid #2a2e43; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='#252b42'" onmouseout="this.style.background='transparent'">
                <span><strong>${u.nome}</strong> (${u.username})</span>
                <span style="font-size: 0.75rem; color: #7c3aed;">+ Adicionar</span>
            </div>
        `).join('');
        container.style.display = 'block';
    } catch (e) {}
}

function selecionarUtilizadorParaGrupo(email, nome, containerResultadosId) {
    const idInput = containerResultadosId.replace('resultados-busca-', 'membro-email-');
    const inputAlvo = document.getElementById(idInput);
    if (inputAlvo) {
        inputAlvo.value = email;
    }
    const container = document.getElementById(containerResultadosId);
    if (container) container.style.display = 'none';
    mostrarToast(`Utilizador ${nome} selecionado!`);
}

async function adicionarMembroGrupo(grupoId, emailParam) {
    let emailMembro = emailParam;
    if (!emailMembro) {
        const inputEl = document.getElementById(`membro-email-${grupoId}`);
        if (inputEl) {
            emailMembro = inputEl.value.trim();
        }
    }

    if (!emailMembro || emailMembro === 'undefined' || emailMembro === '') {
        mostrarToast("Por favor, digite ou selecione um e-mail válido para convidar.", "erro");
        return;
    }

    const token = obterToken();
    try {
        const url = `${SERVICO_DE_COMUNIDADE_URL}/grupos/${grupoId}/membros?membro_email=${encodeURIComponent(emailMembro)}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const inputEl = document.getElementById(`membro-email-${grupoId}`);
            if (inputEl) inputEl.value = '';

            if (typeof carregarGruposPrivados === 'function') {
                carregarGruposPrivados();
            }
            if (typeof carregarMembrosDoGrupoUI === 'function') {
                carregarMembrosDoGrupoUI(grupoId);
            }
            mostrarToast("Membro convidado e adicionado com sucesso!");
        } else {
            const erroData = await res.json().catch(() => ({}));
            mostrarToast("Erro ao adicionar membro: " + (erroData.detail || "Erro desconhecido"), "erro");
        }
    } catch (e) {
        mostrarToast("Erro de conexão ao adicionar membro.", "erro");
    }
}

async function abrirModalEditarTitulo(grupoId, nomeAtual) {
    const novoTitulo = prompt('Digite o novo título/assunto para o chat:', nomeAtual);
    if (novoTitulo === null) return;
    if (!novoTitulo.trim()) {
        mostrarToast('O título não pode estar vazio.', 'erro');
        return;
    }

    const token = obterToken();
    try {
        const res = await fetch(`${SERVICO_DE_COMUNIDADE_URL}/grupos/${grupoId}/titulo`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: novoTitulo.trim() })
        });
        if (!res.ok) throw new Error('Falha ao atualizar título.');

        carregarGruposPrivados();
        mostrarToast('Título atualizado com sucesso!');
    } catch (e) {
        mostrarToast('Erro: ' + e.message, 'erro');
    }
}

async function iniciarChamadaVoz(grupoId) {
    const salaId = `ludarium-grupo-voz-${grupoId}-${Math.random().toString(36).substring(2, 7)}`;
    const urlMeet = `https://meet.jit.si/${salaId}`;
    mostrarToast('📞 A ligar canal de voz...');
    window.open(urlMeet, '_blank');
}

async function iniciarVideoChamada(grupoId) {
    const salaId = `ludarium-grupo-video-${grupoId}-${Math.random().toString(36).substring(2, 7)}`;
    const urlMeet = `https://meet.jit.si/${salaId}`;
    mostrarToast('📹 A iniciar videochamada...');
    window.open(urlMeet, '_blank');
}