// ==========================================
// LUDARIUM - SCRIPT DE AUTENTICAÇÃO E LOGIN
// ==========================================

const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = "http://localhost:8003";
const SERVICO_DE_CAMPANHAS = SERVICO_DE_CAMPANHAS_URL;
const SERVICO_DE_PERFIL_URL = "http://localhost:8004";
const GATEWAY_URL = "http://localhost:8005";

// Variável de controlo para alternar entre ecrã de Login e Registo
let modoRegistoAtivo = false;

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
function definirBotaoCarregamento(botao, aCarregar, textoOriginal = "ENTRAR NA LUDARIUM →") {
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
 * Adiciona suporte para submeter o formulário pressionando a tecla Enter
 */
document.addEventListener("DOMContentLoaded", () => {
    const inputs = document.querySelectorAll('#authFormContainer input');
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executarAcaoAuth();
            }
        });
    });
});

/**
 * Alterna dinamicamente os campos e a ação do botão entre Entrar e Criar Conta
 */
function alternarModoAuth(event) {
    if (event) event.preventDefault();
    modoRegistoAtivo = !modoRegistoAtivo;

    const title = document.getElementById('formTitle');
    const subtitle = document.getElementById('formSubtitle');
    const btn = document.getElementById('authBtnAction');
    const toggleText = document.getElementById('toggleText');
    const toggleLink = document.getElementById('toggleLink');
    const userFieldContainer = document.getElementById('usernameFieldContainer');
    const labelUserEmail = document.getElementById('labelUserEmail');
    const suggestionsBox = document.getElementById('suggestionsBox');

    if (suggestionsBox) suggestionsBox.style.display = 'none';

    if (modoRegistoAtivo) {
        if (title) title.textContent = 'Junte-se ao Ludarium.';
        if (subtitle) subtitle.textContent = 'Crie a sua conta para publicar e gerir os seus jogos.';
        if (btn) btn.textContent = 'CRIAR CONTA →';
        if (toggleText) toggleText.textContent = 'Já tem uma conta?';
        if (toggleLink) toggleLink.textContent = 'Entrar';
        if (userFieldContainer) userFieldContainer.style.display = 'block';
        if (labelUserEmail) labelUserEmail.textContent = 'EMAIL DE ACESSO';
        const loginUser = document.getElementById('loginUser');
        if (loginUser) loginUser.placeholder = 'seu@email.com';
    } else {
        if (title) title.textContent = 'Continue construindo.';
        if (subtitle) subtitle.textContent = 'Acesse seu perfil, projetos e jornadas em andamento.';
        if (btn) btn.textContent = 'ENTRAR NA LUDARIUM →';
        if (toggleText) toggleText.textContent = 'Ainda não tem conta?';
        if (toggleLink) toggleLink.textContent = 'Criar uma conta';
        if (userFieldContainer) userFieldContainer.style.display = 'none';
        if (labelUserEmail) labelUserEmail.textContent = 'UTILIZADOR OU EMAIL';
        const loginUser = document.getElementById('loginUser');
        if (loginUser) loginUser.placeholder = 'Ex.: admin ou email@teste.com';
    }
}

/**
 * Preenche o formulário automaticamente com o administrador de demonstração
 */
function preencherAdminDemo() {
    if (modoRegistoAtivo) {
        alternarModoAuth({ preventDefault: () => {} });
    }
    const loginUser = document.getElementById('loginUser');
    const loginPass = document.getElementById('loginPass');
    if (loginUser) loginUser.value = 'admin';
    if (loginPass) loginPass.value = 'admin';
    mostrarToast('Credenciais de Administrador carregadas!', 'sucesso');
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
 * Realiza o registo de um novo utilizador e redireciona para o login
 */
async function fazerRegisto() {
    const usernameInput = document.getElementById('regUsername');
    const emailInput = document.getElementById('loginUser');
    const passInput = document.getElementById('loginPass');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';

    if (!username || !email || !pass) {
        mostrarToast('Por favor, preencha todos os campos do registo.', 'erro');
        return;
    }

    const btn = document.getElementById('authBtnAction');
    definirBotaoCarregamento(btn, true, 'CRIAR CONTA →');

    try {
        const response = await fetch(`${GATEWAY_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, email: email, password: pass })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const mensagemErro = errData.detail || 'Utilizador ou email já existente.';
            
            if (mensagemErro.toLowerCase().includes('já existe') || response.status === 400 || response.status === 422) {
                exibirSugestoesUtilizador(username);
            }
            throw new Error(mensagemErro);
        }

        mostrarToast('Conta criada com sucesso! Faça login para continuar.', 'sucesso');
        
        // CORREÇÃO APLICADA: Retorna para o modo de login e preenche o campo de utilizador/email automaticamente
        alternarModoAuth({ preventDefault: () => {} });
        if (emailInput) emailInput.value = email;
        if (passInput) passInput.value = ''; // Limpa a senha por segurança
        
    } catch (error) {
        console.warn('Erro no registo: ' + error.message);
        mostrarToast(error.message, 'erro');
    } finally {
        definirBotaoCarregamento(btn, false, 'CRIAR CONTA →');
    }
}

/**
 * Exibe sugestões de nomes alternativos caso o nome de utilizador já esteja em uso
 */
function exibirSugestoesUtilizador(nomeTentado) {
    const suggestionsBox = document.getElementById('suggestionsBox');
    const suggestionsList = document.getElementById('suggestionsList');
    if (!suggestionsBox || !suggestionsList) return;

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
        chip.style.cssText = "background: #7c3aed; color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: bold; display: inline-block; margin: 3px;";
        chip.textContent = `@${sugestao}`;
        chip.onclick = () => {
            const regUsername = document.getElementById('regUsername');
            if (regUsername) regUsername.value = sugestao;

            const emailInput = document.getElementById('loginUser');
            if (emailInput) {
                emailInput.value = `${sugestao}@ludarium.com`;
            }

            suggestionsBox.style.display = 'none';
        };
        suggestionsList.appendChild(chip);
    });

    suggestionsBox.style.display = 'block';
}

/**
 * Realiza o login e redireciona para a home enviando o token na URL (evitando o ciclo de logout)
 */
async function fazerLogin() {
    const userInput = document.getElementById('loginUser');
    const passInput = document.getElementById('loginPass');

    const user = userInput ? userInput.value.trim() : '';
    const pass = passInput ? passInput.value.trim() : '';

    if (!user || !pass) {
        mostrarToast('Por favor, preencha o utilizador/email e a senha.', 'erro');
        return;
    }

    const btn = document.getElementById('authBtnAction');
    definirBotaoCarregamento(btn, true, 'ENTRAR NA LUDARIUM →');

    try {
        const response = await fetch(`${GATEWAY_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: user, password: pass })
        });

        if (!response.ok) throw new Error('Utilizador ou senha incorretos.');

        const data = await response.json();
        const token = data.access_token || data.token;
        if (!token) throw new Error('Token não recebido do servidor.');

        // 1. Guarda no localStorage da porta atual do Gateway/Auth
        localStorage.setItem('ludarium_token', token);
        mostrarToast('Login efetuado com sucesso! Redirecionando...', 'sucesso');

        // 2. Redireciona para a home na porta 8081 passando o token explicitamente na query string
        setTimeout(() => {
            window.location.href = `${PROJECT_SERVICE_URL}/frontend/home.html?token=${encodeURIComponent(token)}`;
        }, 800);
    } catch (error) {
        mostrarToast('Erro no login: ' + error.message, 'erro');
    } finally {
        definirBotaoCarregamento(btn, false, 'ENTRAR NA LUDARIUM →');
    }
}