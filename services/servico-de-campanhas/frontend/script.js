const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = 'http://localhost:8003';
const SERVICO_DE_CAMPANHAS = SERVICO_DE_CAMPANHAS_URL; 
const SERVICO_DE_PERFIL_URL = "http://localhost:8004";
const GATEWAY_URL = "http://localhost:8005";

/**
 * Sincronização automática do token entre portas e carregamento inicial
 */
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenUrl = urlParams.get('token');
    if (tokenUrl) {
        localStorage.setItem('ludarium_token', tokenUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

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

    fetchCampaigns();
});

/**
 * Função para buscar e listar as campanhas (Endpoint correto: /campanhas)
 */
async function fetchCampaigns() {
    const listContainer = document.getElementById('campaigns-list');
    if (!listContainer) return;

    try {
        const response = await fetch(`${SERVICO_DE_CAMPANHAS}/campanhas`);
        if (!response.ok) throw new Error('Erro ao carregar campanhas');
        
        const campaigns = await response.json();
        
        if (!Array.isArray(campaigns) || campaigns.length === 0) {
            listContainer.innerHTML = '<p class="loading">Nenhuma campanha encontrada.</p>';
            return;
        }

        listContainer.innerHTML = '';
        campaigns.forEach(camp => {
            const item = document.createElement('div');
            item.className = 'campaign-item';
            item.innerHTML = `
                <h3>${camp.titulo}</h3>
                <p>${camp.descricao}</p>
                <p>Recompensa: <span>${camp.recompensa_xp || 2500} XP</span> | Categoria: <span>${camp.categoria || 'Geral'}</span></p>
            `;
            listContainer.appendChild(item);
        });
    } catch (error) {
        console.error(error);
        listContainer.innerHTML = '<p class="loading" style="color: red;">Erro ao comunicar com a API. Certifique-se de que o serviço está a correr na porta 8003.</p>';
    }
}

/**
 * Evento para criar nova campanha
 */
const campaignForm = document.getElementById('campaign-form');
if (campaignForm) {
    campaignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const goal = parseFloat(document.getElementById('goal').value) || 2500;
        const token = localStorage.getItem('ludarium_token') || '';

        try {
            const response = await fetch(`${SERVICO_DE_CAMPANHAS}/campanhas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    titulo: title, 
                    descricao: description, 
                    recompensa_xp: goal,
                    categoria: "GAME JAM",
                    nivel: "Iniciante"
                })
            });

            if (!response.ok) throw new Error('Erro ao criar campanha');

            campaignForm.reset();
            fetchCampaigns();
            alert('Campanha criada com sucesso!');
        } catch (error) {
            alert('Erro ao guardar a campanha. Verifique a consola.');
            console.error(error);
        }
    });
}