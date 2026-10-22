
// URLs dos microserviços em execução
const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const GATEWAY_URL = "http://localhost:8001";

// Variável de controlo para alternar entre ecrã de Login e Registo
let modoRegistoAtivo = false;
let currentAdminRecipient = null;

/**
 * Função executada ao carregar a página para verificar se já existe sessão ativa
 */
async function verificarSessao() {
    const token = localStorage.getItem('ludarium_token');
    if (token) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('homeScreen').style.display = 'block';
        
        await atualizarPerfilMenu(token); // <-- Adicionado aqui

        carregarProjetosHome();
        carregarMensagensPrivadas();
        verificarPermissoesAdmin();
    }
}

/**
 * Verifica as permissões do utilizador logado: exibe a pesquisa para todos e painéis exclusivos para o admin
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

        // 1. Habilita a caixa de pesquisa para TODOS os utilizadores logados
        const searchBox = document.getElementById('adminSearchBox');
        if (searchBox) searchBox.style.display = 'block';

        // 2. Mantém e protege os painéis ou ações exclusivas apenas para o administrador
        if (user.username === 'admin') {
            // Insira aqui elementos visuais ou de moderação estritos do admin, caso existam
            console.log('Sessão de Administrador autenticada com privilégios totais.');
        } else {
            // Oculta elementos estritos de admin para utilizadores comuns, se necessário
            const elementosAdminExclusivos = document.querySelectorAll('.admin-only');
            elementosAdminExclusivos.forEach(el => el.style.display = 'none');
        }
    } catch (e) {
        console.error('Erro ao verificar permissões:', e);
    }
}

/**
 * Alterna dinamicamente os campos e a ação do botão entre Entrar e Criar Conta
 */
function alternarModoAuth(event) {
    event.preventDefault();
    modoRegistoAtivo = !modoRegistoAtivo;

    const title = document.getElementById('formTitle');
    const subtitle = document.getElementById('formSubtitle');
    const btn = document.getElementById('authBtnAction');
    const toggleText = document.getElementById('toggleText');
    const toggleLink = document.getElementById('toggleLink');
    const userFieldContainer = document.getElementById('usernameFieldContainer');
    const labelUserEmail = document.getElementById('labelUserEmail');
    const suggestionsBox = document.getElementById('suggestionsBox');

    suggestionsBox.style.display = 'none';

    if (modoRegistoAtivo) {
        title.textContent = 'Junte-se ao Ludarium.';
        subtitle.textContent = 'Crie a sua conta para publicar e gerir os seus jogos.';
        btn.textContent = 'CRIAR CONTA →';
        toggleText.textContent = 'Já tem uma conta?';
        toggleLink.textContent = 'Entrar';
        userFieldContainer.style.display = 'block';
        labelUserEmail.textContent = 'EMAIL DE ACESSO';
        document.getElementById('loginUser').placeholder = 'seu@email.com';
    } else {
        title.textContent = 'Continue construindo.';
        subtitle.textContent = 'Acesse seu perfil, projetos e jornadas em andamento.';
        btn.textContent = 'ENTRAR NA LUDARIUM →';
        toggleText.textContent = 'Ainda não tem conta?';
        toggleLink.textContent = 'Criar uma conta';
        userFieldContainer.style.display = 'none';
        labelUserEmail.textContent = 'UTILIZADOR OU EMAIL';
        document.getElementById('loginUser').placeholder = 'Ex.: admin ou email@teste.com';
    }
}

/**
 * Preenche o formulário automaticamente com o administrador de demonstração
 */
function preencherAdminDemo() {
    if (modoRegistoAtivo) {
        alternarModoAuth({ preventDefault: () => {} });
    }
    document.getElementById('loginUser').value = 'admin';
    document.getElementById('loginPass').value = 'admin';
}

/**
 * Direciona para a função correta dependendo se está no modo de Login ou de Registo
 */
function executarAcaoAuth() {
    if (modoRegistoAtivo) {
        fazerRegisto();
    } else {
        fazerLogin();
    }
}

/**
 * Realiza o registo de um novo utilizador
 */
async function fazerRegisto() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;

    if (!username || !email || !pass) {
        alert('Por favor, preencha todos os campos do registo.');
        return;
    }

    try {
        const response = await fetch(`${GATEWAY_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, email: email, password: pass })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const mensagemErro = errData.detail || 'Utilizador ou email já existente.';
            
            if (mensagemErro.toLowerCase().includes('já existe') || response.status === 400) {
                exibirSugestoesUtilizador(username);
            }
            throw new Error(mensagemErro);
        }

        alert('Conta criada com sucesso! Faça login para continuar.');
        alternarModoAuth({ preventDefault: () => {} });
    } catch (error) {
        console.warn('Erro no registo: ' + error.message);
    }
}

/**
 * Exibe sugestões de nomes alternativos caso o nome de utilizador já esteja em uso
 */
function exibirSugestoesUtilizador(nomeTentado) {
    const suggestionsBox = document.getElementById('suggestionsBox');
    const suggestionsList = document.getElementById('suggestionsList');
    suggestionsList.innerHTML = '';

    const sufixos = [
        Math.floor(Math.random() * 900 + 100),
        '_dev',
        '_indie'
    ];

    sufixos.forEach(sufixo => {
        const sugestao = `${nomeTentado}${sufixo}`;
        const chip = document.createElement('div');
        chip.className = 'suggestion-chip';
        chip.textContent = sugestao;
        chip.onclick = () => {
            document.getElementById('regUsername').value = sugestao;
            suggestionsBox.style.display = 'none';
        };
        suggestionsList.appendChild(chip);
    });

    suggestionsBox.style.display = 'block';
}

/**
 * Realiza o login enviando as credenciais para o Gateway JWT
 */
async function fazerLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;

    try {
        const response = await fetch(`${GATEWAY_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: user, password: pass })
        });

        if (!response.ok) throw new Error('Utilizador ou senha incorretos.');

        const data = await response.json();
        localStorage.setItem('ludarium_token', data.access_token);

        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('homeScreen').style.display = 'block';

        await atualizarPerfilMenu(data.access_token); // <-- Adicionado aqui

        carregarProjetosHome();
        carregarMensagensPrivadas();
        verificarPermissoesAdmin();

    } catch (error) {
        alert('Erro no login: ' + error.message);
    }
}
/**
 * Termina a sessão do utilizador
 */
function fazerLogout() {
    localStorage.removeItem('ludarium_token');
    localStorage.removeItem('ludarium_user');

    const navUserSpan = document.getElementById('navUsername');
    if (navUserSpan) navUserSpan.textContent = '';
    
    const avatarDiv = document.getElementById('navUserAvatar');
    if (avatarDiv) avatarDiv.innerHTML = ''; // <-- Limpa o avatar

    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

/**
 * Abre o modal flutuante de submissão de novo projeto
 */
function abrirModalProjeto() {
    document.getElementById('modalProjeto').style.display = 'flex';
}

/**
 * Fecha o modal flutuante de submissão de projeto
 */
function fecharModalProjeto() {
    const modal = document.getElementById('modalProjeto');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Cria um alias seguro para evitar qualquer erro caso o código chame o outro nome
function fecharModalNovoProjeto() {
    fecharModalProjeto();
}

/**
 * Envia o formulário do novo projeto
 */
async function enviarNovoProjeto(event) {
    event.preventDefault();
    const token = localStorage.getItem('ludarium_token');

    const formData = new FormData();
    formData.append('title', document.getElementById('projTitle').value);
    formData.append('studio', 'Northwind Studio');
    formData.append('description', document.getElementById('projDesc').value);
    formData.append('tags', document.getElementById('projTags').value);
    formData.append('progress', document.getElementById('projProgress').value);
    formData.append('executavel_navegador', document.getElementById('projExecutavel').checked ? '1' : '0');
    
    const zipFile = document.getElementById('projZip').files[0];
    if (zipFile) formData.append('build_zip', zipFile);

    const posterFile = document.getElementById('projPoster').files[0];
    if (posterFile) formData.append('poster_file', posterFile);

    try {
        const response = await fetch(`${GATEWAY_URL}/projects`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) throw new Error('Erro ao salvar projeto.');

        alert('Projeto publicado e guardado com sucesso na base de dados!');
        fecharModalProjeto();
        carregarProjetosHome();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

/**
 * Busca todos os projetos na base de dados e aplica a regra restrita de que
 * o utilizador comum só gere estritamente o que ele próprio publicou.
 */
async function carregarProjetosHome() {
    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects`);
        if (!response.ok) {
            console.error('Erro na resposta do servidor de projetos:', response.status);
            return;
        }
        const projetos = await response.json();

        const usuarioLogado = (localStorage.getItem('ludarium_user') || '').trim().toLowerCase();
        const emailLogado = (localStorage.getItem('ludarium_email') || '').trim().toLowerCase();
        const éAdmin = (usuarioLogado === 'admin');

        const grid = document.getElementById('projectsGrid');
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
            const éDono = (usuarioLogado !== '' && donoProjeto !== '' && (donoProjeto === usuarioLogado || (emailLogado !== '' && donoProjeto === emailLogado)));
            const podeGerir = éAdmin || éDono;

            // Garante que apanha o build_path ou gera o caminho padrão baseado no slug do título se houver executável
            let rawBuildPath = p.build_path;
            if (!rawBuildPath && p.executavel_navegador === 1) {
                rawBuildPath = `sandbox_builds/${p.title.toLowerCase().replace(/[\s]+/g, '_')}`;
            }
            const safeBuildPath = (rawBuildPath || '').replace(/\\/g, '/');

            const safeTitle = encodeURIComponent(p.title || '');
            const safeDesc = encodeURIComponent(p.description || '');

            card.innerHTML = `
                <div class="project-img-container" onclick="testarJogoSePossivel('${safeBuildPath}')">
                    <img src="${imagemUrl}" alt="${p.title}">
                </div>
                <div class="project-info" onclick="testarJogoSePossivel('${safeBuildPath}')">
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

/**
 * Envia o formulário do novo projeto capturando diretamente os inputs reais do HTML
 */
async function enviarNovoProjeto(event) {
    event.preventDefault();
    const token = localStorage.getItem('ludarium_token') || '';

    const form = event.target;
    const formData = new FormData();

    // Captura os valores reais inseridos pelo utilizador nos inputs do HTML
    const titleVal = document.getElementById('projTitle').value;
    const descVal = document.getElementById('projDesc').value;
    const tagsVal = document.getElementById('projTags').value;
    const progressVal = document.getElementById('projProgress').value;
    const execCheck = document.getElementById('projExecutavel').checked;

    formData.append('title', titleVal);
    formData.append('studio', 'Estúdio Independente');
    formData.append('description', descVal);
    formData.append('tags', tagsVal);
    formData.append('progress', progressVal);
    formData.append('executavel_navegador', execCheck ? '1' : '0');

    // Captura o ficheiro ZIP selecionado
    const zipInput = document.getElementById('projZip');
    if (zipInput && zipInput.files[0]) {
        formData.append('build_file', zipInput.files[0]);
    }

    // Captura o poster selecionado (se houver)
    const posterInput = document.getElementById('projPoster');
    if (posterInput && posterInput.files[0]) {
        formData.append('poster', posterInput.files[0]);
    }

    try {
        const response = await fetch(`${PROJECT_SERVICE_URL}/projects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Erro ao criar projeto: ${response.status}`);
        }

        const resultado = await response.json();
        console.log('Projeto criado com sucesso:', resultado);

        fecharModalProjeto();
        carregarProjetosHome();
        form.reset();
    } catch (error) {
        console.error('Erro na submissão:', error);
        alert('Erro ao criar projeto. Verifique a consola.');
    }
}

/**
 * Dispara a execução do jogo na sandbox com validação completa do caminho
 */
function testarJogoSePossivel(buildPath) {
    console.log("Caminho da build recebido:", buildPath);
    if (buildPath && buildPath !== 'null' && buildPath !== 'undefined' && buildPath !== '') {
        executarJogo(buildPath);
    } else {
        alert('Este projeto não possui uma build executável no navegador.');
    }
}

// 3. Salvar Edição de Projeto
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

// 4. Excluir Projeto
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


function abrirModalEditar(event, id, titleEncoded, descEncoded, progress) {
    event.stopPropagation();
    
    const idInput = document.getElementById('editProjId');
    const titleInput = document.getElementById('editProjTitle');
    const descInput = document.getElementById('editProjDesc');
    const progressInput = document.getElementById('editProjProgress');

    if (idInput) idInput.value = id;
    if (titleInput) titleInput.value = decodeURIComponent(titleEncoded);
    if (descInput) descInput.value = decodeURIComponent(descEncoded);
    if (progressInput) progressInput.value = progress;

    // Procura por qualquer variação do ID do modal para garantir que abre sem erros
    const modal = document.getElementById('modalEditar') || document.getElementById('modalEditarProjeto');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Modal de edição não encontrado no HTML.');
    }
}

function fecharModalEditar() {
    document.getElementById('modalEditarProjeto').style.display = 'none';
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
        // CORREÇÃO: Deve usar PROJECT_SERVICE_URL (8081) e não GATEWAY_URL (8001)
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
        // ATENÇÃO: Tem de ser PROJECT_SERVICE_URL (porta 8081) e nunca GATEWAY_URL (8001)
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

function executarJogo(buildPath) {
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
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

function minimizarSandbox() {
    const wrapper = document.getElementById('sandboxWrapper');
    if (!wrapper) return;
    if (wrapper.style.height === '150px') {
        wrapper.style.height = '600px';
    } else {
        wrapper.style.height = '150px';
    }
}

function expandirSandbox() {
    const wrapper = document.getElementById('sandboxWrapper');
    if (!wrapper) return;
    if (!document.fullscreenElement) {
        if (wrapper.requestFullscreen) {
            wrapper.requestFullscreen();
        }
    } else {
        document.exitFullscreen();
    }
}

function ajustarVolume(valor) {
    const icon = document.getElementById('volIcon');
    if (valor == 0) {
        icon.textContent = '🔇';
    } else if (valor < 0.5) {
        icon.textContent = '🔉';
    } else {
        icon.textContent = '🔊';
    }
}

function mutarAudio() {
    const slider = document.getElementById('volSlider');
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
 * ==========================================================================
 * GESTÃO DE MENSAGENS PRIVADAS, PESQUISA DE UTILIZADORES E MODERAÇÃO ADMIN
 * ==========================================================================
 */

/**
 * Carrega as mensagens privadas corrigindo o fuso horário e exibindo o botão de apagar (×)
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
            
            // Corrige o fuso horário adicionando 'Z' para o navegador interpretar como UTC e converter para o horário local correto
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

/**
 * Apaga uma mensagem privada específica pelo ID
 */
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
        
        // Atualiza o Username no menu
        const navUserSpan = document.getElementById('navUsername');
        if (navUserSpan) {
            navUserSpan.textContent = user.username;
        }

        // Atualiza o Avatar (Usa a foto se houver, ou a primeira letra do username)
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