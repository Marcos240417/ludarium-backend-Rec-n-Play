const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = 'http://localhost:8003';
const SERVICO_DE_CAMPANHAS = SERVICO_DE_CAMPANHAS_URL; // Alias para compatibilidade com as funções
const SERVICO_DE_PERFIL_URL = "http://localhost:8004";
const GATEWAY_URL = "http://localhost:8005";

// Variável de controlo para alternar entre ecrã de Login e Registo
let modoRegistoAtivo = false;

/**
 * Verifica se já existe sessão ativa ao abrir a página de login
 */
function verificarSessaoLogin() {
    const token = localStorage.getItem('ludarium_token');
    if (token) {
        window.location.href = 'index.html';
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
 * Realiza o login e redireciona para a home
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

        window.location.href = 'index.html';
    } catch (error) {
        alert('Erro no login: ' + error.message);
    }
}