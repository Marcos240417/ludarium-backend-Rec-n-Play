const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = "http://localhost:8003";
const SERVICO_DE_CAMPANHAS = SERVICO_DE_CAMPANHAS_URL;
const SERVICO_DE_PERFIL_URL = "http://localhost:8004";
const GATEWAY_URL = "http://localhost:8005";

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
 * Função para buscar e listar as campanhas
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
            item.style.cssText = "background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 10px; margin-bottom: 12px;";
            item.innerHTML = `
                <h3 style="margin-bottom: 8px; color: #fff;">${camp.titulo}</h3>
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 12px;">${camp.descricao}</p>
                <div style="font-size: 0.8rem; color: #c4b5fd; display: flex; gap: 15px;">
                    <span>Recompensa: <strong>${camp.recompensa_xp || 2500} XP</strong></span>
                    <span>Categoria: <strong>${camp.categoria || 'Geral'}</strong></span>
                    <span>Nível: <strong>${camp.nivel || 'Iniciante'}</strong></span>
                </div>
            `;
            listContainer.appendChild(item);
        });
    } catch (error) {
        console.error(error);
        listContainer.innerHTML = '<p class="loading" style="color: #ef4444;">Erro ao comunicar com a API. Certifique-se de que o microsserviço está ativo na porta 8003.</p>';
    }
}

/**
 * Evento para criar nova campanha
 */
const campaignForm = document.getElementById('campaign-form');
if (campaignForm) {
    campaignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const titleInput = document.getElementById('title');
        const descInput = document.getElementById('description');
        const goalInput = document.getElementById('goal');
        const submitBtn = campaignForm.querySelector('button[type="submit"]');

        const title = titleInput ? titleInput.value.trim() : '';
        const description = descInput ? descInput.value.trim() : '';
        const goal = parseFloat(goalInput ? goalInput.value : 2500) || 2500;
        const token = localStorage.getItem('ludarium_token') || '';

        if (!title || !description) {
            mostrarToast('Por favor, preencha o título e a descrição.', 'erro');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'A criar...';
        }

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
            mostrarToast('Campanha criada com sucesso!', 'sucesso');
        } catch (error) {
            mostrarToast('Erro ao guardar a campanha. Verifique a consola.', 'erro');
            console.error(error);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Criar Campanha';
            }
        }
    });
}