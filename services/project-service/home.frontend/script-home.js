const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = 'http://localhost:8003';
const SERVICO_DE_CAMPANHAS = SERVICO_DE_CAMPANHAS_URL;
const SERVICO_DE_PERFIL_URL = "http://localhost:8004";
const GATEWAY_URL = "http://localhost:8005";

let currentAdminRecipient = null;
let projetoAtualId = null; // Guarda o ID do jogo em teste para o feedback pós-jogo

/**
 * Função auxiliar para obter o token JWT de forma segura
 */
function obterToken() {
    let token = localStorage.getItem('ludarium_token');
    if (!token) {
        window.location.href = 'login.html';
    }
    return token;
}

/**
 * ⚡ CORREÇÃO CRUCIAL: Captura o token da URL IMEDIATAMENTE quando o script é lido,
 * garantindo que o localStorage é preenchido ANTES do 'onload' da página disparar.
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

    // Event listener para o formulário de feedback pós-jogo
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
});

/**
 * Verifica a sessão ao carregar a página principal (index.html)
 */
async function verificarSessaoDashboard() {
    const token = localStorage.getItem('ludarium_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    await atualizarPerfilMenu(token);
    carregarProjetosHome();
    carregarMensagensPrivadas();
    verificarPermissoesAdmin();
}

/**
 * Verifica as permissões de administrador
 */
async function verificarPermissoesAdmin() {
    const token = localStorage.getItem('ludarium_token');
    if (!token) return;

    try {
        const response = await fetch(`${GATEWAY_URL}/me`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) return;
        const user = await response.json();

        const searchBox = document.getElementById('adminSearchBox');
        if (searchBox) searchBox.style.display = 'block';

        if (user.username === 'admin') {
            console.log('Sessão de Administrador autenticada.');
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
}

function fecharModalNovoProjeto() {
    fecharModalProjeto();
}

/**
 * Submete um novo projeto
 */
async function enviarNovoProjeto(event) {
    event.preventDefault();
    const token = localStorage.getItem('ludarium_token') || '';

    const form = event.target;
    const formData = new FormData();

    formData.append('title', document.getElementById('projTitle').value);
    formData.append('studio', 'Estúdio Independente');
    formData.append('description', document.getElementById('projDesc').value);
    formData.append('tags', document.getElementById('projTags').value);
    formData.append('progress', document.getElementById('projProgress').value);
    formData.append('executavel_navegador', document.getElementById('projExecutavel').checked ? '1' : '0');
    
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
        form.reset();
        alert('Projeto publicado com sucesso!');
    } catch (error) {
        console.error('Erro na submissão:', error);
        alert('Erro ao criar projeto.');
    }
}

/**
 * Carrega a lista de projetos na Home
 */
async function carregarProjetosHome() {
    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects`);
        if (!response.ok) return;
        const projetos = await response.json();

        const usuarioLogado = (localStorage.getItem('ludarium_user') || '').trim().toLowerCase();
        const éAdmin = (usuarioLogado === 'admin');

        const grid = document.getElementById('projectsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!Array.isArray(projetos) || projetos.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-muted);">Nenhum projeto encontrado.</p>';
            return;
        }

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

            let rawBuildPath = p.build_path;
            if (!rawBuildPath && p.executavel_navegador === 1) {
                rawBuildPath = `sandbox_builds/${p.title.toLowerCase().replace(/[\s]+/g, '_')}`;
            }
            const safeBuildPath = (rawBuildPath || '').replace(/\\/g, '/');

            const safeTitle = encodeURIComponent(p.title || '');
            const safeDesc = encodeURIComponent(p.description || '');

            card.innerHTML = `
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
                </div>
                ${podeGerir ? `
                    <div class="project-author-actions">
                        <button class="btn-action-edit" onclick="abrirModalEditar(event, '${p.id}', '${safeTitle}', '${safeDesc}', '${p.progress || 100}')">✏️ Editar</button>
                        <button class="btn-action-delete" onclick="excluirProjeto(event, '${p.id}')">🗑️ Excluir</button>
                    </div>
                ` : ''}
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        console.error('Erro ao buscar projetos:', e);
    }
}

function testarJogoSePossivel(projectId, buildPath) {
    if (buildPath && buildPath !== 'null' && buildPath !== 'undefined' && buildPath !== '') {
        executarJogo(projectId, buildPath);
    } else {
        alert('Este projeto não possui uma build executável no navegador.');
    }
}

function abrirModalEditar(event, id, titleEncoded, descEncoded, progress) {
    event.stopPropagation();
    
    document.getElementById('editProjId').value = id;
    document.getElementById('editProjTitle').value = decodeURIComponent(titleEncoded);
    document.getElementById('editProjDesc').value = decodeURIComponent(descEncoded);
    document.getElementById('editProjProgress').value = progress;

    const modal = document.getElementById('modalEditarProjeto');
    if (modal) modal.style.display = 'flex';
}

function fecharModalEditar() {
    const modal = document.getElementById('modalEditarProjeto');
    if (modal) modal.style.display = 'none';
}

async function salvarEdicaoProjeto(event) {
    event.preventDefault();
    const token = localStorage.getItem('ludarium_token');
    const id = document.getElementById('editProjId').value;

    const dadosAtualizados = {
        title: document.getElementById('editProjTitle').value,
        description: document.getElementById('editProjDesc').value,
        progress: parseInt(document.getElementById('editProjProgress').value)
    };

    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosAtualizados)
        });

        if (!response.ok) throw new Error('Falha ao atualizar o projeto.');

        alert('Projeto atualizado com sucesso!');
        fecharModalEditar();
        carregarProjetosHome();
    } catch (error) {
        alert('Erro ao editar: ' + error.message);
    }
}

async function excluirProjeto(event, id) {
    event.stopPropagation();
    if (!confirm('Tem certeza de que deseja excluir este projeto permanentemente?')) return;

    const token = localStorage.getItem('ludarium_token');

    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Falha ao excluir o projeto.');

        alert('Projeto excluído com sucesso!');
        carregarProjetosHome();
    } catch (error) {
        alert('Erro ao excluir: ' + error.message);
    }
}

/**
 * Executa o jogo no Sandbox e guarda o ID atual para posterior avaliação
 */
function executarJogo(projectId, buildPath) {
    projetoAtualId = projectId; // Guarda o ID do projeto ativo no sandbox

    const container = document.getElementById('sandboxContainer');
    const iframe = document.getElementById('gameIframe');

    const partes = buildPath.replace(/\\/g, '/').split('/');
    const pastaJogo = partes[partes.length - 1];
    
    iframe.src = `${PROJECT_SERVICE_URL}/sandbox/${pastaJogo}/index.html`;
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Fecha o sandbox e abre automaticamente o modal de feedback pós-jogo
 */
function fecharSandbox() {
    const container = document.getElementById('sandboxContainer');
    if (container) container.style.display = 'none';
    const iframe = document.getElementById('gameIframe');
    if (iframe) iframe.src = '';
    if (document.fullscreenElement) document.exitFullscreen();

    // Se um jogo estava a ser executado, abre o modal de feedback para ganhar XP
    if (projetoAtualId) {
        document.getElementById('feedback-project-id').value = projetoAtualId;
        const modalFeedback = document.getElementById('modal-feedback-jogo');
        if (modalFeedback) modalFeedback.style.display = 'flex';
    }
}

/**
 * Submete o feedback do jogo testado e credita +75 XP ao utilizador
 */
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

        alert('Feedback submetido com sucesso! Ganhou +75 XP 🎉');
        fecharModalFeedbackSemXP();
    } catch (error) {
        console.error("Erro:", error);
        alert('Erro ao enviar avaliação. Tente novamente.');
    }
}

/**
 * Fecha o modal de feedback sem submeter avaliação (não ganha XP)
 */
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

/**
 * MENSAGENS E ADMIN
 */
async function carregarMensagensPrivadas() {
    const token = localStorage.getItem('ludarium_token');
    const container = document.getElementById('myMessagesList');
    if (!container) return;

    try {
        const response = await fetch(`${GATEWAY_URL}/messages/my-messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const messages = await response.json();
        container.innerHTML = '';

        if (!Array.isArray(messages) || messages.length === 0) {
            container.innerHTML = '<span style="color: var(--text-muted);">Não tem nenhuma mensagem nova da administração.</span>';
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
    }
}

async function apagarMensagem(msgId) {
    const token = localStorage.getItem('ludarium_token');
    try {
        const response = await fetch(`${GATEWAY_URL}/messages/${msgId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao apagar mensagem.');
        carregarMensagensPrivadas();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function pesquisarUtilizadorAdmin() {
    const termo = document.getElementById('adminSearchInput').value.trim();
    const resultDiv = document.getElementById('adminSearchResult');
    const token = localStorage.getItem('ludarium_token');

    if (!termo) {
        alert('Por favor, digite um username ou email para pesquisar.');
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
    const token = localStorage.getItem('ludarium_token');
    const content = document.getElementById('adminMessageText').value.trim();
    const recipient = currentAdminRecipient;

    if (!content) {
        alert('Por favor, escreva o conteúdo da mensagem.');
        return;
    }

    try {
        const response = await fetch(`${GATEWAY_URL}/messages/send-admin-message?recipient_username=${encodeURIComponent(recipient)}&content=${encodeURIComponent(content)}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Falha ao enviar mensagem privada.');

        alert('Mensagem privada enviada com sucesso ao utilizador!');
        closeAdminMessageModal();
    } catch (error) {
        alert('Erro: ' + error.message);
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