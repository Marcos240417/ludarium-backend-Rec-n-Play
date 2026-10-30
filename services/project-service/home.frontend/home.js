const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = 'http://localhost:8003';
const SERVICO_DE_CAMPANHAS = SERVICO_DE_CAMPANHAS_URL;
const SERVICO_DE_PERFIL_URL = "http://localhost:8004";
const GATEWAY_URL = "http://localhost:8005";

let currentAdminRecipient = null;
let projetoAtualId = null; // Guarda o ID do jogo em teste para o feedback pós-jogo
let equipeSelecionada = []; // Guarda os usernames dos membros da equipe selecionados para o projeto
let equipeSelecionadaEdicao = []; // Guarda os usernames dos membros da equipe selecionados para a edição

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

    if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
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

/**
 * Controla o estado de carregamento de um botão com um spinner animado
 */
function definirBotaoCarregamento(botao, aCarregar, textoOriginal = "Guardar Alterações") {
    if (!botao) return;
    if (aCarregar) {
        botao.disabled = true;
        botao.dataset.textoOriginal = botao.textContent;
        botao.innerHTML = `<span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle;"></span> A processar...`;
    } else {
        botao.disabled = false;
        botao.textContent = botao.dataset.textoOriginal || textoOriginal;
    }
}

/**
 * Função auxiliar para obter o token JWT de forma segura
 */
function obterToken() {
    let token = localStorage.getItem('ludarium_token') || localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
    }
    return token;
}

/**
 * Extrai o utilizador atual diretamente do token JWT de forma síncrona e segura
 */
function obterUtilizadorAtualDoToken() {
    const token = obterToken();
    if (!token) return '';
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);
        return (payload.sub || payload.email || payload.username || '').trim().toLowerCase();
    } catch (e) {
        return '';
    }
}

/**
 * Captura o token da URL IMEDIATAMENTE quando o script é lido
 */
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenUrl = urlParams.get('token');
    if (tokenUrl) {
        localStorage.setItem('ludarium_token', tokenUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
})();

/**
 * Intercepta cliques nos links de navegação do menu para propagar o token atual na URL
 */
document.addEventListener("DOMContentLoaded", () => {
    const linksMenu = document.querySelectorAll('.nav-links a');
    linksMenu.forEach(link => {
        link.addEventListener('click', (e) => {
            const token = obterToken();
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

    const formFeedback = document.getElementById('form-feedback-jogo');
    if (formFeedback) {
        formFeedback.addEventListener('submit', async function(event) {
            event.preventDefault();
            const projectId = document.getElementById('feedback-project-id').value;
            const nota = document.getElementById('nota-jogo').value;
            const comentario = document.getElementById('comentario-jogo').value;

            await submeterFeedbackJogo(projectId, nota, comentario);
        });
    }

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notificationsDropdown');
        const notifContainer = document.querySelector('.nav-notifications');
        if (dropdown && dropdown.style.display === 'block' && notifContainer && !notifContainer.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            fecharModalProjeto();
            fecharModalEditar();
            closeAdminMessageModal();
            fecharModalFeedbackSemXP();
            const dropdown = document.getElementById('notificationsDropdown');
            if (dropdown) dropdown.style.display = 'none';
        }
    });
});

/**
 * Verifica a sessão ao carregar a página principal (home.html)
 */
async function verificarSessaoDashboard() {
    const token = obterToken();
    if (!token) return;
    
    atualizarPerfilMenu(token).catch(e => console.warn('Aviso: Perfil indisponível', e));
    carregarProjetosHome().catch(e => console.error('Erro ao carregar projetos:', e));
    carregarMensagensPrivadas().catch(e => console.warn('Aviso: Mensagens indisponíveis', e));
    carregarProjetosSobInspecaoUsuario().catch(e => console.warn('Aviso: Inspeções indisponíveis', e));
    verificarPermissoesAdmin().catch(e => console.warn('Aviso: Permissões admin indisponíveis', e));
    carregarNotificacoes().catch(e => console.warn('Aviso: Notificações indisponíveis', e));
    carregarCampanhasNoSelect().catch(e => console.warn('Aviso: Campanhas indisponíveis', e));
    carregarLeaderboard().catch(e => console.warn('Aviso: Leaderboard indisponível', e));
}

/**
 * Verifica as permissões de administrador
 */
async function verificarPermissoesAdmin() {
    const token = obterToken();
    if (!token) return;

    try {
        const response = await fetch(`${GATEWAY_URL}/me`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) return;
        const user = await response.json();

        const searchBox = document.getElementById('adminSearchBox');
        if (searchBox) searchBox.style.display = 'block';

        if (user.username === 'admin' || user.email === 'admin@ludarium.com') {
            console.log('Sessão de Administrador autenticada.');
            const elementosAdminExclusivos = document.querySelectorAll('.admin-only');
            elementosAdminExclusivos.forEach(el => {
                el.classList.remove('admin-only');
                el.style.display = 'block';
            });
        } else {
            const elementosAdminExclusivos = document.querySelectorAll('.admin-only');
            elementosAdminExclusivos.forEach(el => el.style.display = 'none');
        }
    } catch (e) {
        console.error('Erro ao verificar permissões:', e);
    }
}

/**
 * Termina a sessão do utilizador
 */
function fazerLogout() {
    localStorage.removeItem('ludarium_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('ludarium_user');
    window.location.href = 'login.html';
}

function abrirModalProjeto() {
    const modal = document.getElementById('modalProjeto');
    if (modal) modal.style.display = 'flex';
}

function fecharModalProjeto() {
    const modal = document.getElementById('modalProjeto');
    if (modal) modal.style.display = 'none';
    
    equipeSelecionada = [];
    atualizarListaEquipeUI();
}

function fecharModalNovoProjeto() {
    fecharModalProjeto();
}

/**
 * Carrega as campanhas / Game Jams disponíveis
 */
async function carregarCampanhasNoSelect() {
    const select = document.getElementById('projCampaignSelect');
    if (!select) return;

    try {
        const response = await fetch(`${SERVICO_DE_CAMPANHAS}/campanhas`);
        if (!response.ok) return;
        const campanhas = await response.json();

        if (Array.isArray(campanhas)) {
            select.innerHTML = '<option value="">Nenhuma (Projeto Independente Geral)</option>';
            campanhas.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id || 1;
                option.textContent = c.titulo || c.title;
                select.appendChild(option);
            });
        }
    } catch (e) {
        console.error('Erro ao carregar campanhas para o select:', e);
    }
}

async function pesquisarMembroEquipe() {
    const termo = document.getElementById('memberSearchInput').value.trim();
    const resultDiv = document.getElementById('memberSearchResult');
    const token = obterToken();

    if (!termo) {
        resultDiv.innerHTML = '<span style="color: #fca5a5;">Digite um username para pesquisar.</span>';
        return;
    }

    resultDiv.innerHTML = 'A pesquisar...';

    try {
        const response = await fetch(`${GATEWAY_URL}/users/search?username=${encodeURIComponent(termo)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Utilizador não encontrado.');

        const user = await response.json();
        
        if (equipeSelecionada.includes(user.username)) {
            resultDiv.innerHTML = '<span style="color: #fca5a5;">Este utilizador já faz parte da equipe.</span>';
            return;
        }

        resultDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(124, 58, 237, 0.15); padding: 8px; border-radius: 6px; border: 1px solid #7c3aed;">
                <span>👤 <strong>${user.username}</strong> (${user.email})</span>
                <button type="button" onclick="adicionarMembroEquipe('${user.username}')" style="background: #10b981; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">+ Adicionar</button>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `<span style="color: #fca5a5;">⚠️ ${error.message}</span>`;
    }
}

function adicionarMembroEquipe(username) {
    if (!equipeSelecionada.includes(username)) {
        equipeSelecionada.push(username);
        atualizarListaEquipeUI();
    }
    document.getElementById('memberSearchInput').value = '';
    document.getElementById('memberSearchResult').innerHTML = '';
}

function removerMembroEquipe(username) {
    equipeSelecionada = equipeSelecionada.filter(m => m !== username);
    atualizarListaEquipeUI();
}

function atualizarListaEquipeUI() {
    const listDiv = document.getElementById('selectedTeamList');
    const hiddenField = document.getElementById('projMembersField');
    
    if (!listDiv || !hiddenField) return;

    listDiv.innerHTML = '';
    hiddenField.value = equipeSelecionada.join(',');

    if (equipeSelecionada.length === 0) {
        listDiv.innerHTML = '<span style="color: #9ca3af; font-size: 0.8rem;">Nenhum integrante adicionado ainda.</span>';
        return;
    }

    equipeSelecionada.forEach(username => {
        const chip = document.createElement('div');
        chip.style.cssText = "background: #7c3aed; color: #fff; padding: 4px 10px; border-radius: 15px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;";
        chip.innerHTML = `
            <span>@${username}</span>
            <button type="button" onclick="removerMembroEquipe('${username}')" style="background: none; border: none; color: #fff; cursor: pointer; font-weight: bold; font-size: 0.9rem; padding: 0;">&times;</button>
        `;
        listDiv.appendChild(chip);
    });
}

/**
 * Submete um novo projeto
 */
async function enviarNovoProjeto(event) {
    event.preventDefault();
    const token = obterToken();

    const form = event.target;
    const formData = new FormData();

    formData.append('title', document.getElementById('projTitle').value);
    formData.append('studio', 'Estúdio Independente');
    formData.append('description', document.getElementById('projDesc').value);
    formData.append('tags', document.getElementById('projTags').value);
    formData.append('progress', document.getElementById('projProgress').value);
    formData.append('executavel_navegador', document.getElementById('projExecutavel').checked ? '1' : '0');
    
    const campaignId = document.getElementById('projCampaignSelect').value;
    if (campaignId) {
        formData.append('campaign_id', campaignId);
    }

    const membersStr = document.getElementById('projMembersField').value;
    if (membersStr) {
        formData.append('members', membersStr);
    }

    const zipInput = document.getElementById('projZip');
    if (zipInput && zipInput.files[0]) {
        formData.append('build_file', zipInput.files[0]);
    }

    const posterInput = document.getElementById('projPoster');
    if (posterInput && posterInput.files[0]) {
        formData.append('poster', posterInput.files[0]);
    }

    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) throw new Error(`Erro ao criar projeto: ${response.status}`);

        fecharModalProjeto();
        carregarProjetosHome();
        carregarProjetosSobInspecaoUsuario();
        form.reset();
        mostrarToast('Projeto publicado com sucesso e equipa vinculada!', 'sucesso');
    } catch (error) {
        console.error('Erro na submissão:', error);
        mostrarToast('Erro ao criar projeto.', 'erro');
    }
}

/**
 * Carrega a lista de projetos na Home validando estritamente a autoria e permissões pelo token.
 */
async function carregarProjetosHome(tagFiltro = '') {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    
    grid.innerHTML = '<p style="color: #9ca3af; padding: 10px;">A carregar projetos...</p>';

    try {
        let url = `${PROJECT_SERVICE_URL}/projects`;
        if (tagFiltro && tagFiltro.trim() !== '') {
            url += `?tag=${encodeURIComponent(tagFiltro)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro ao buscar projetos (Status: ${response.status})`);
        }
        
        const projetos = await response.json();
        grid.innerHTML = '';

        if (!Array.isArray(projetos) || projetos.length === 0) {
            grid.innerHTML = '<p style="color: #9ca3af; padding: 10px;">Nenhum projeto encontrado.</p>';
            return;
        }

        // Identificação segura, síncrona e imediata através do Token JWT (evita race conditions)
        const usuarioLogado = obterUtilizadorAtualDoToken();
        const éAdmin = (usuarioLogado === 'admin' || usuarioLogado === 'admin@ludarium.com');

        projetos.forEach(p => {
            const card = document.createElement('div');
            card.className = 'project-card';
            
            let imagemUrl = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
            if (p.poster_path) {
                imagemUrl = `${PROJECT_SERVICE_URL}${p.poster_path}`;
            }

            const donoProjeto = (p.owner || p.user_id || '').trim().toLowerCase();
            const éDono = (usuarioLogado !== '' && donoProjeto !== '' && donoProjeto === usuarioLogado);
            const podeGerir = éAdmin || éDono;

            const statusProj = (p.status || '').toLowerCase();
            const estaInspecionado = statusProj.includes('inspeção') || statusProj.includes('aguardando') || statusProj.includes('suspenso');

            if (estaInspecionado) {
                card.style.cssText = 'border: 2px solid #f59e0b; background: rgba(245, 158, 11, 0.03); position: relative;';
            }

            const badgeInspecao = estaInspecionado ? `<div style="background: #f59e0b; color: #000; font-size: 0.65rem; font-weight: bold; padding: 3px 6px; text-align: center; border-radius: 4px 4px 0 0; margin-bottom: 5px;">⏳ SOB INSPEÇÃO - AÇÃO NECESSÁRIA</div>` : '';

            let rawBuildPath = p.build_path;
            if (!rawBuildPath && p.executavel_navegador === 1) {
                rawBuildPath = `sandbox_builds/${p.title.toLowerCase().replace(/[\s]+/g, '_')}`;
            }
            const safeBuildPath = (rawBuildPath || '').replace(/\\/g, '/');

            const safeTitle = encodeURIComponent(p.title || '');
            const safeDesc = encodeURIComponent(p.description || '');
            const safeTags = encodeURIComponent(p.tags ? (Array.isArray(p.tags) ? p.tags.join(', ') : p.tags) : '');
            const safeMembers = encodeURIComponent(p.members || '');
            const safeCampaign = p.campaign_id || '';
            const safeStatus = encodeURIComponent(p.status || '');
            const safeReply = encodeURIComponent(p.inspection_reply || '');

            let membrosHTML = '';
            if (p.members) {
                const listaMembros = p.members.split(',').map(m => m.trim()).filter(m => m);
                if (listaMembros.length > 0) {
                    const chipsMembros = listaMembros.map(m => `
                        <a href="http://127.0.0.1:8004/frontend/perfil.html?user=${encodeURIComponent(m)}" style="color: #d8b4fe; background: rgba(124, 58, 237, 0.25); border: 1px solid rgba(124, 58, 237, 0.4); padding: 2px 8px; border-radius: 12px; text-decoration: none; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 3px;" title="Ver perfil de @${m}">
                            👤 @${m}
                        </a>
                    `).join('');

                    membrosHTML = `
                        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; flex-wrap: wrap; align-items: center; gap: 5px;">
                            <span style="font-size: 0.75rem; color: #9ca3af; font-weight: bold;">Colaboradores:</span>
                            ${chipsMembros}
                        </div>
                    `;
                }
            }

            const corFavorito = p.favorito === 1 ? '#f59e0b' : '#9ca3af';

            card.innerHTML = `
                ${badgeInspecao}
                <div class="project-img-container" onclick="testarJogoSePossivel('${p.id}', '${safeBuildPath}')">
                    <img src="${imagemUrl}" alt="${p.title}">
                </div>
                <div class="project-info" onclick="testarJogoSePossivel('${p.id}', '${safeBuildPath}')">
                    <div class="project-studio">${p.studio || 'Estúdio Independente'}</div>
                    <div class="project-title">${p.title}</div>
                    <div class="project-desc">${p.description}</div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${p.progress || 100}%;"></div>
                    </div>
                    <div class="project-tags">
                        ${Array.isArray(p.tags) ? p.tags.map(t => `<span class="tag">${t}</span>`).join('') : ''}
                    </div>
                    ${membrosHTML}
                    
                    <div style="display: flex; align-items: center; gap: 15px; margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
                        <button onclick="curtirProjeto(event, '${p.id}')" style="background: transparent; border: none; color: #d8b4fe; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 0.85rem; font-weight: 500;" title="Curtir projeto">
                            ❤️ <span>${p.likes || 0}</span>
                        </button>
                        <button onclick="favoritarProjeto(event, '${p.id}')" style="background: transparent; border: none; color: ${corFavorito}; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 0.85rem;" title="Marcar como favorito">
                            ⭐ <span>Favorito</span>
                        </button>
                    </div>
                </div>
                ${podeGerir ? `
                    <div class="project-author-actions">
                        <button class="btn-action-edit" onclick="abrirModalEditar(event, '${p.id}', '${safeTitle}', '${safeDesc}', '${p.progress || 100}', '${safeTags}', '${safeMembers}', '${safeCampaign}', '${safeStatus}', '${safeReply}')">✏️ Editar</button>
                        <button class="btn-action-delete" onclick="excluirProjeto(event, '${p.id}')">🗑️ Excluir</button>
                    </div>
                ` : ''}
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        console.error('Erro ao buscar projetos:', e);
        grid.innerHTML = `<p style="color: #ef4444; padding: 10px;">Erro ao carregar projetos (Servidor de projetos na porta 8081 indisponível ou offline).</p>`;
    }
}

function filtrarProjetosTexto() {
    const input = document.getElementById('adminSearchInput');
    if (!input) return;

    const termo = input.value.toLowerCase();
    const cards = document.querySelectorAll('.project-card');
    
    cards.forEach(card => {
        const titulo = card.querySelector('.project-title').textContent.toLowerCase();
        const desc = card.querySelector('.project-desc').textContent.toLowerCase();
        if (titulo.includes(termo) || desc.includes(termo)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function filtrarPorTag(tag) {
    carregarProjetosHome(tag);
}

async function carregarLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;

    try {
        const response = await fetch(`${SERVICO_DE_PERFIL_URL}/perfil/leaderboard`);
        if (!response.ok) throw new Error('Não foi possível carregar o leaderboard.');

        const utilizadores = await response.json();
        container.innerHTML = '';

        if (!Array.isArray(utilizadores) || utilizadores.length === 0) {
            container.innerHTML = '<span style="color: #9ca3af; font-size: 0.9rem;">Ainda não há pontuações registadas.</span>';
            return;
        }

        utilizadores.forEach((user, index) => {
            const posicao = index + 1;
            let corBadge = '#4b5563';
            if (posicao === 1) corBadge = '#f59e0b';
            else if (posicao === 2) corBadge = '#94a3b8';
            else if (posicao === 3) corBadge = '#b45309';

            const item = document.createElement('div');
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(124, 58, 237, 0.1); padding: 10px 15px; border-radius: 8px; border: 1px solid rgba(124, 58, 237, 0.3);";
            
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="background: ${corBadge}; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">${posicao}</span>
                    <span style="color: #fff; font-weight: 500; font-size: 0.9rem;">${user.arroba || '@' + user.nome}</span>
                </div>
                <span style="color: #d8b4fe; font-weight: bold; font-size: 0.9rem;">⚡ ${user.xp_atual || 0} XP</span>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Erro ao carregar leaderboard:', error);
        container.innerHTML = '<span style="color: #ef4444; font-size: 0.9rem;">Erro ao carregar o ranking.</span>';
    }
}

async function curtirProjeto(event, id) {
    event.stopPropagation();
    const token = obterToken();
    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects/${id}/avaliar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Falha ao curtir o projeto.');

        mostrarToast('Projeto curtido com sucesso! 👍', 'sucesso');
        carregarProjetosHome();
    } catch (error) {
        mostrarToast('Erro ao curtir: ' + error.message, 'erro');
    }
}

async function favoritarProjeto(event, id) {
    event.stopPropagation();
    const token = obterToken();
    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects/${id}/favorito`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Falha ao atualizar favorito.');

        mostrarToast('Estado de favorito atualizado com sucesso! ⭐', 'sucesso');
        carregarProjetosHome();
    } catch (error) {
        mostrarToast('Erro ao favoritar: ' + error.message, 'erro');
    }
}

function testarJogoSePossivel(projectId, buildPath) {
    if (buildPath && buildPath !== 'null' && buildPath !== 'undefined' && buildPath !== '') {
        executarJogo(projectId, buildPath);
    } else {
        mostrarToast('Este projeto não possui uma build executável no navegador.', 'erro');
    }
}

async function abrirModalEditar(event, id, titleEncoded, descEncoded, progress, tagsEncoded, membersEncoded, campaignId, statusEncoded = '', replyEncoded = '') {
    event.stopPropagation();
    
    document.getElementById('editProjId').value = id;
    document.getElementById('editProjTitle').value = decodeURIComponent(titleEncoded);
    document.getElementById('editProjDesc').value = decodeURIComponent(descEncoded);
    document.getElementById('editProjProgress').value = progress;
    document.getElementById('editProjTags').value = decodeURIComponent(tagsEncoded);

    const status = decodeURIComponent(statusEncoded).toLowerCase();
    const replyContainer = document.getElementById('editInspectionReplyContainer');
    const replyField = document.getElementById('editInspectionReply');
    const estaInspecionado = status.includes('inspeção') || status.includes('aguardando') || status.includes('suspenso');

    if (estaInspecionado && replyContainer && replyField) {
        replyContainer.style.display = 'block';
        replyField.value = decodeURIComponent(replyEncoded);
    } else if (replyContainer) {
        replyContainer.style.display = 'none';
        if (replyField) replyField.value = '';
    }

    await carregarCampanhasNoSelectEdicao(campaignId);

    equipeSelecionadaEdicao = [];
    const membersStr = decodeURIComponent(membersEncoded);
    if (membersStr) {
        equipeSelecionadaEdicao = membersStr.split(',').map(m => m.trim()).filter(m => m);
    }
    atualizarListaEquipeEdicaoUI();

    const modal = document.getElementById('modalEditarProjeto');
    if (modal) modal.style.display = 'flex';
}

function fecharModalEditar() {
    const modal = document.getElementById('modalEditarProjeto');
    if (modal) modal.style.display = 'none';
    equipeSelecionadaEdicao = [];
}

async function carregarCampanhasNoSelectEdicao(selectedCampaignId) {
    const select = document.getElementById('editProjCampaignSelect');
    if (!select) return;

    try {
        const response = await fetch(`${SERVICO_DE_CAMPANHAS}/campanhas`);
        if (!response.ok) return;
        const campanhas = await response.json();

        if (Array.isArray(campanhas)) {
            select.innerHTML = '<option value="">Nenhuma (Projeto Independente Geral)</option>';
            campanhas.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.titulo || c.title;
                if (String(c.id) === String(selectedCampaignId)) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    } catch (e) {
        console.error('Erro ao carregar campanhas na edição:', e);
    }
}

async function pesquisarMembroEquipeEdicao() {
    const termo = document.getElementById('editMemberSearchInput').value.trim();
    const resultDiv = document.getElementById('editMemberSearchResult');
    const token = obterToken();

    if (!termo) {
        resultDiv.innerHTML = '<span style="color: #fca5a5;">Digite um username para pesquisar.</span>';
        return;
    }

    resultDiv.innerHTML = 'A pesquisar...';

    try {
        const response = await fetch(`${GATEWAY_URL}/users/search?username=${encodeURIComponent(termo)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Utilizador não encontrado.');

        const user = await response.json();
        
        if (equipeSelecionadaEdicao.includes(user.username)) {
            resultDiv.innerHTML = '<span style="color: #fca5a5;">Este utilizador já faz parte da equipe.</span>';
            return;
        }

        resultDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(124, 58, 237, 0.15); padding: 8px; border-radius: 6px; border: 1px solid #7c3aed;">
                <span>👤 <strong>${user.username}</strong></span>
                <button type="button" onclick="adicionarMembroEquipeEdicao('${user.username}')" style="background: #10b981; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">+ Adicionar</button>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `<span style="color: #fca5a5;">⚠️ ${error.message}</span>`;
    }
}

function adicionarMembroEquipeEdicao(username) {
    if (!equipeSelecionadaEdicao.includes(username)) {
        equipeSelecionadaEdicao.push(username);
        atualizarListaEquipeEdicaoUI();
    }
    document.getElementById('editMemberSearchInput').value = '';
    document.getElementById('editMemberSearchResult').innerHTML = '';
}

function removerMembroEquipeEdicao(username) {
    equipeSelecionadaEdicao = equipeSelecionadaEdicao.filter(m => m !== username);
    atualizarListaEquipeEdicaoUI();
}

function atualizarListaEquipeEdicaoUI() {
    const listDiv = document.getElementById('editSelectedTeamList');
    const hiddenField = document.getElementById('editProjMembersField');
    
    if (!listDiv || !hiddenField) return;

    listDiv.innerHTML = '';
    hiddenField.value = equipeSelecionadaEdicao.join(',');

    if (equipeSelecionadaEdicao.length === 0) {
        listDiv.innerHTML = '<span style="color: #9ca3af; font-size: 0.8rem;">Nenhum integrante adicionado.</span>';
        return;
    }

    equipeSelecionadaEdicao.forEach(username => {
        const chip = document.createElement('div');
        chip.style.cssText = "background: #7c3aed; color: #fff; padding: 4px 10px; border-radius: 15px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;";
        chip.innerHTML = `
            <span>@${username}</span>
            <button type="button" onclick="removerMembroEquipeEdicao('${username}')" style="background: none; border: none; color: #fff; cursor: pointer; font-weight: bold; font-size: 0.9rem; padding: 0;">&times;</button>
        `;
        listDiv.appendChild(chip);
    });
}

async function salvarEdicaoProjeto(event) {
    event.preventDefault();
    const token = obterToken();
    const id = document.getElementById('editProjId').value;
    const btnSubmit = event.target.querySelector('button[type="submit"]');

    const campaignIdVal = document.getElementById('editProjCampaignSelect').value;
    const replyField = document.getElementById('editInspectionReply');

    const dadosAtualizados = {
        title: document.getElementById('editProjTitle').value,
        description: document.getElementById('editProjDesc').value,
        progress: parseInt(document.getElementById('editProjProgress').value),
        tags: document.getElementById('editProjTags').value,
        campaign_id: campaignIdVal ? parseInt(campaignIdVal) : null,
        members: document.getElementById('editProjMembersField').value
    };

    if (replyField && replyField.offsetParent !== null) {
        dadosAtualizados.inspection_reply = replyField.value.trim();
    }

    definirBotaoCarregamento(btnSubmit, true, "Guardar Alterações");

    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosAtualizados)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Falha ao atualizar o projeto.');
        }

        mostrarToast('Projeto e resposta de inspeção guardados com sucesso!', 'sucesso');
        fecharModalEditar();
        carregarProjetosHome();
        carregarProjetosSobInspecaoUsuario();
    } catch (error) {
        mostrarToast('Erro ao editar: ' + error.message, 'erro');
    } finally {
        definirBotaoCarregamento(btnSubmit, false, "Guardar Alterações");
    }
}

async function excluirProjeto(event, id) {
    event.stopPropagation();
    if (!confirm('Tem certeza de que deseja excluir este projeto permanentemente?')) return;

    const token = obterToken();

    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Falha ao excluir o projeto.');
        }

        mostrarToast('Projeto excluído com sucesso!', 'sucesso');
        carregarProjetosHome();
        carregarProjetosSobInspecaoUsuario();
    } catch (error) {
        mostrarToast('Erro ao excluir: ' + error.message, 'erro');
    }
}

function executarJogo(projectId, buildPath) {
    projetoAtualId = projectId;

    const container = document.getElementById('sandboxContainer');
    const iframe = document.getElementById('gameIframe');

    const partes = buildPath.replace(/\\/g, '/').split('/');
    const pastaJogo = partes[partes.length - 1];
    
    iframe.src = `${PROJECT_SERVICE_URL}/sandbox/${pastaJogo}/index.html`;
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
}

function fecharSandbox() {
    const container = document.getElementById('sandboxContainer');
    if (container) container.style.display = 'none';
    const iframe = document.getElementById('gameIframe');
    if (iframe) iframe.src = '';
    if (document.fullscreenElement) document.exitFullscreen();

    if (projetoAtualId) {
        document.getElementById('feedback-project-id').value = projetoAtualId;
        const modalFeedback = document.getElementById('modal-feedback-jogo');
        if (modalFeedback) modalFeedback.style.display = 'flex';
    }
}

async function submeterFeedbackJogo(projectId, nota, comentario) {
    const token = obterToken();

    const dadosFeedback = {
        pontuacao: parseInt(nota),
        comentario: comentario
    };

    try {
        const response = await fetch(`${GATEWAY_URL}/projects/${projectId}/testar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosFeedback)
        });

        if (!response.ok) throw new Error('Falha ao submeter a avaliação do jogo.');

        mostrarToast('Feedback submetido com sucesso! Ganhou +75 XP 🎉', 'sucesso');
        carregarLeaderboard();
        fecharModalFeedbackSemXP();
    } catch (error) {
        console.error("Erro:", error);
        mostrarToast('Erro ao enviar avaliação. Tente novamente.', 'erro');
    }
}

function fecharModalFeedbackSemXP() {
    const modal = document.getElementById('modal-feedback-jogo');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('form-feedback-jogo');
    if (form) form.reset();
    projetoAtualId = null;
}

function minimizarSandbox() {
    const wrapper = document.getElementById('sandboxWrapper');
    if (!wrapper) return;
    wrapper.style.height = wrapper.style.height === '150px' ? '600px' : '150px';
}

function expandirSandbox() {
    const wrapper = document.getElementById('sandboxWrapper');
    if (!wrapper) return;
    if (!document.fullscreenElement) {
        if (wrapper.requestFullscreen) wrapper.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function ajustarVolume(valor) {
    const icon = document.getElementById('volIcon');
    if (!icon) return;
    if (valor == 0) icon.textContent = '🔇';
    else if (valor < 0.5) icon.textContent = '🔉';
    else icon.textContent = '🔊';
}

function mutarAudio() {
    const slider = document.getElementById('volSlider');
    if (!slider) return;
    if (slider.value > 0) {
        slider.dataset.lastVal = slider.value;
        slider.value = 0;
        ajustarVolume(0);
    } else {
        slider.value = slider.dataset.lastVal || 1;
        ajustarVolume(slider.value);
    }
}

async function carregarMensagensPrivadas() {
    const token = obterToken();
    const container = document.getElementById('myMessagesList');
    if (!container) return;

    try {
        const response = await fetch(`${GATEWAY_URL}/messages/my-messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Falha ao carregar mensagens');

        const messages = await response.json();
        container.innerHTML = '';

        if (!Array.isArray(messages) || messages.length === 0) {
            container.innerHTML = '<span style="color: #9ca3af;">Não tem nenhuma mensagem nova da administração.</span>';
            return;
        }

        messages.forEach(msg => {
            const card = document.createElement('div');
            card.style.cssText = "background: rgba(124, 58, 237, 0.15); border-left: 3px solid #7c3aed; padding: 10px; margin-top: 8px; border-radius: 4px; position: relative;";
            
            let dataFormatada = msg.created_at;
            try {
                const dataObj = new Date(msg.created_at.endsWith('Z') ? msg.created_at : msg.created_at + 'Z');
                dataFormatada = dataObj.toLocaleString();
            } catch (e) {
                dataFormatada = msg.created_at;
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #d8b4fe; margin-bottom: 4px;">
                    <div><strong>De:</strong> ${msg.sender_username} — <span style="color: #9ca3af;">${dataFormatada}</span></div>
                    <button onclick="apagarMensagem(${msg.id})" style="background: none; border: none; color: #fca5a5; font-size: 1.1rem; cursor: pointer; font-weight: bold; padding: 0 4px;" title="Apagar mensagem">&times;</button>
                </div>
                <div style="color: #fff; font-size: 0.9rem;">${msg.content}</div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Erro ao buscar mensagens privadas:', error);
        container.innerHTML = '<span style="color: #ef4444; font-size: 0.9rem;">Erro ao carregar mensagens (Gateway indisponível).</span>';
    }
}

async function apagarMensagem(msgId) {
    const token = obterToken();
    try {
        const response = await fetch(`${GATEWAY_URL}/messages/${msgId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao apagar mensagem.');
        carregarMensagensPrivadas();
    } catch (error) {
        mostrarToast('Erro: ' + error.message, 'erro');
    }
}

async function pesquisarUtilizadorAdmin() {
    const termo = document.getElementById('adminSearchInput').value.trim();
    const resultDiv = document.getElementById('adminSearchResult');
    const token = obterToken();

    if (!termo) {
        mostrarToast('Por favor, digite um username ou email para pesquisar.', 'erro');
        return;
    }

    resultDiv.innerHTML = 'A pesquisar...';
    const queryParam = termo.includes('@') ? `email=${encodeURIComponent(termo)}` : `username=${encodeURIComponent(termo)}`;

    try {
        const response = await fetch(`${GATEWAY_URL}/users/search?${queryParam}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Utilizador não encontrado.');

        const userData = await response.json();
        resultDiv.innerHTML = `
            <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid #7c3aed; padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p><strong>ID:</strong> ${userData.id}</p>
                    <p><strong>Username:</strong> ${userData.username}</p>
                    <p><strong>Email:</strong> ${userData.email}</p>
                </div>
                <button onclick="abrirModalAdminMensagem(event, '${userData.username}')" style="background: #7c3aed; color: #fff; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">💬 Enviar Mensagem Privada</button>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `<span style="color: #fca5a5;">⚠️ ${error.message}</span>`;
    }
}

function abrirModalAdminMensagem(event, autorUsername) {
    if (event) event.stopPropagation();
    currentAdminRecipient = autorUsername;
    document.getElementById('modalRecipientUser').textContent = autorUsername;
    document.getElementById('adminMessageModal').style.display = 'flex';
}

function closeAdminMessageModal() {
    document.getElementById('adminMessageModal').style.display = 'none';
    document.getElementById('adminMessageText').value = '';
    currentAdminRecipient = null;
}

async function submitAdminMessage() {
    const token = obterToken();
    const content = document.getElementById('adminMessageText').value.trim();
    const recipient = currentAdminRecipient;

    if (!content) {
        mostrarToast('Por favor, escreva o conteúdo da mensagem.', 'erro');
        return;
    }

    try {
        const response = await fetch(`${GATEWAY_URL}/messages/send-admin-message?recipient_username=${encodeURIComponent(recipient)}&content=${encodeURIComponent(content)}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Falha ao enviar mensagem privada.');

        mostrarToast('Mensagem privada enviada com sucesso ao utilizador!', 'sucesso');
        closeAdminMessageModal();
    } catch (error) {
        mostrarToast('Erro: ' + error.message, 'erro');
    }
}

async function atualizarPerfilMenu(token) {
    try {
        const response = await fetch(`${GATEWAY_URL}/me`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) return;

        const user = await response.json();
        
        const navUserSpan = document.getElementById('navUsername');
        if (navUserSpan) navUserSpan.textContent = user.username;

        const avatarDiv = document.getElementById('navUserAvatar');
        if (avatarDiv) {
            if (user.avatar_url) {
                avatarDiv.innerHTML = `<img src="${user.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                avatarDiv.textContent = user.username.charAt(0).toUpperCase();
            }
        }
        
        localStorage.setItem('ludarium_user', user.username);
    } catch (e) {
        console.error('Erro ao atualizar perfil no menu:', e);
    }
}

async function carregarNotificacoes() {
    const token = obterToken();
    const list = document.getElementById('notificationsList');
    if (!token || !list) return;

    try {
        const response = await fetch(`${GATEWAY_URL}/notifications`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) return;
        const notificacoes = await response.json();
        
        const badge = document.getElementById('notificationBadge');
        const naoLidas = notificacoes.filter(n => n.is_read === 0).length;
        if (naoLidas > 0) {
            badge.textContent = naoLidas;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
        
        if (!Array.isArray(notificacoes) || notificacoes.length === 0) {
            list.innerHTML = '<span style="color: #9ca3af;">Sem notificações recentes.</span>';
            return;
        }
        
        list.innerHTML = '';
        notificacoes.forEach(n => {
            const item = document.createElement('div');
            item.style.cssText = `padding: 8px; margin-bottom: 6px; background: ${n.is_read === 0 ? 'rgba(124, 58, 237, 0.25)' : 'rgba(255, 255, 255, 0.03)'}; border-radius: 6px; cursor: pointer; border-left: 3px solid ${n.is_read === 0 ? '#7c3aed' : '#4b5563'};`;
            
            let dataFormatada = n.created_at;
            try {
                dataFormatada = new Date(n.created_at.endsWith('Z') ? n.created_at : n.created_at + 'Z').toLocaleString();
            } catch (e) {}

            item.innerHTML = `
                <div style="color: #fff; font-weight: ${n.is_read === 0 ? 'bold' : 'normal'};">${n.content}</div>
                <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 3px;">${dataFormatada}</div>
            `;
            item.onclick = () => marcarNotificacaoLida(n.id);
            list.appendChild(item);
        });
    } catch (e) {
        console.error('Erro ao carregar notificações:', e);
    }
}

function toggleNotificationsMenu() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        const isOpen = dropdown.style.display === 'block';
        dropdown.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
            carregarNotificacoes();
        }
    }
}

async function marcarNotificacaoLida(id) {
    const token = obterToken();
    try {
        await fetch(`${GATEWAY_URL}/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        carregarNotificacoes();
    } catch (e) {
        console.error('Erro ao marcar notificação como lida:', e);
    }
}

async function carregarProjetosSobInspecaoUsuario() {
    const box = document.getElementById('userInspectionAlertBox');
    const list = document.getElementById('userInspectionProjectsList');
    if (!box || !list) return;

    const token = obterToken();
    const usuarioLogado = obterUtilizadorAtualDoToken();
    if (!token || !usuarioLogado) return;

    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const projetos = await response.json();
        if (!Array.isArray(projetos)) return;

        const meusProjetosSobInspecao = projetos.filter(p => {
            const dono = (p.owner || p.user_id || '').trim().toLowerCase();
            const statusProj = (p.status || '').toLowerCase();
            const éMeu = (dono === usuarioLogado);
            const estaInspecionado = statusProj.includes('inspeção') || statusProj.includes('aguardando') || statusProj.includes('suspenso');
            return éMeu && estaInspecionado;
        });

        if (meusProjetosSobInspecao.length > 0) {
            let html = '';
            meusProjetosSobInspecao.forEach(p => {
                const safeTitle = encodeURIComponent(p.title || '');
                const safeDesc = encodeURIComponent(p.description || '');
                const safeTags = encodeURIComponent(p.tags ? (Array.isArray(p.tags) ? p.tags.join(', ') : p.tags) : '');
                const safeMembers = encodeURIComponent(p.members || '');
                const safeCampaign = p.campaign_id || '';
                const safeStatus = encodeURIComponent(p.status || '');
                const safeReply = encodeURIComponent(p.inspection_reply || '');

                html += `
                    <div style="background: #1e1b2e; border: 1px solid #f59e0b; padding: 20px; border-radius: 10px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                            <div>
                                <h4 style="color: #fff; margin: 0 0 5px 0; font-size: 1.05rem;">🎮 ${p.title}</h4>
                                <p style="color: #f59e0b; font-size: 0.85rem; margin: 0 0 5px 0;"><strong>Estado:</strong> ${p.status || 'Sob Inspeção'}</p>
                                ${p.inspection_reason ? `<p style="color: #d8b4fe; font-size: 0.85rem; margin: 4px 0;"><strong>Motivo do Inspetor:</strong> ${p.inspection_reason}</p>` : ''}
                                ${p.inspection_message ? `<p style="color: #d8b4fe; font-size: 0.85rem; margin: 4px 0;"><strong>Instruções:</strong> ${p.inspection_message}</p>` : ''}
                            </div>
                        </div>
                        
                        <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); padding: 15px; border-radius: 8px; margin-top: 10px;">
                            <label style="display: block; color: #f59e0b; font-size: 0.85rem; font-weight: bold; margin-bottom: 6px;">✍️ Escrever Resposta / Comentário de Correção para o Inspetor:</label>
                            <textarea id="reply_input_${p.id}" rows="3" placeholder="Descreva as alterações e correções efetuadas neste projeto..." style="width: 100%; padding: 10px; background: #0f0e17; border: 1px solid #3f3d56; color: #fff; border-radius: 6px; resize: none; font-size: 0.85rem; margin-bottom: 10px;">${p.inspection_reply || ''}</textarea>
                            <div style="display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;">
                                <button onclick="abrirModalEditar(event, '${p.id}', '${safeTitle}', '${safeDesc}', '${p.progress || 100}', '${safeTags}', '${safeMembers}', '${safeCampaign}', '${safeStatus}', '${safeReply}')" style="background: transparent; border: 1px solid #7c3aed; color: #d8b4fe; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                                    ✏️ Editar Detalhes do Projeto
                                </button>
                                <button onclick="enviarRespostaInspecaoDireta('${p.id}')" style="background: #f59e0b; color: #000; border: none; padding: 7px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">
                                    🚀 Enviar Resposta ao Inspetor
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
            box.style.display = 'block';
        } else {
            box.style.display = 'none';
        }
    } catch (e) {
        console.error("Erro ao verificar projetos sob inspeção:", e);
    }
}

async function enviarRespostaInspecaoDireta(projectId) {
    const token = obterToken();
    const replyField = document.getElementById(`reply_input_${projectId}`);
    if (!replyField) return;

    const replyText = replyField.value.trim();
    if (!replyText) {
        mostrarToast('Por favor, escreva a sua resposta de correção antes de enviar.', 'erro');
        return;
    }

    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects/${projectId}/reply-inspection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                reply_message: replyText
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Falha ao enviar resposta de inspeção.');
        }

        mostrarToast('Resposta de correção enviada ao inspetor com sucesso! 👍', 'sucesso');
        carregarProjetosSobInspecaoUsuario();
        carregarProjetosHome();
    } catch (error) {
        mostrarToast('Erro ao enviar resposta: ' + error.message, 'erro');
    }
}