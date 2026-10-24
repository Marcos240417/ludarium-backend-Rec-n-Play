const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = 'http://localhost:8003';
const SERVICO_DE_CAMPANHAS = SERVICO_DE_CAMPANHAS_URL;
const SERVICO_DE_PERFIL_URL = "http://localhost:8004";
const GATEWAY_URL = "http://localhost:8005";

document.addEventListener("DOMContentLoaded", () => {
    // Gestão de token via URL (Sincronização entre portas)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenUrl = urlParams.get('token');
    if (tokenUrl) {
        localStorage.setItem('ludarium_token', tokenUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Interceção de links do menu para injetar o token autenticado
    document.querySelectorAll('.nav-links a').forEach(link => {
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

    fetchUserProfile();
    carregarLeaderboard();
});

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

function toggleEditForm() {
    const container = document.getElementById('edit-form-container');
    if (container.style.display === 'none') {
        container.style.display = 'block';

        // Preencher inputs básicos
        document.getElementById('input-nome').value = document.getElementById('profile-name').textContent;
        document.getElementById('input-arroba').value = document.getElementById('profile-arroba').textContent;
        document.getElementById('input-localizacao').value = document.getElementById('profile-location').textContent.replace('📍 ', '');
        document.getElementById('input-biografia').value = document.getElementById('profile-bio').textContent;

        // Preencher inputs de links dinamicamente com base no que já está carregado na tela
        const linksNaTela = document.querySelectorAll('#profile-links a');
        if (linksNaTela[0]) document.getElementById('input-link1-url').value = linksNaTela[0].href;
        if (linksNaTela[1]) document.getElementById('input-link2-url').value = linksNaTela[1].href;
        if (linksNaTela[2]) document.getElementById('input-link3-url').value = linksNaTela[2].href;

    } else {
        container.style.display = 'none';
    }
}

// Submeter edição
document.getElementById('update-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('ludarium_token') || '';

    const payload = {
        nome: document.getElementById('input-nome').value,
        arroba: document.getElementById('input-arroba').value,
        localizacao: document.getElementById('input-localizacao').value,
        biografia: document.getElementById('input-biografia').value,
        links: [
            { rotulo: "GitHub", url: document.getElementById('input-link1-url').value },
            { rotulo: "LinkedIn", url: document.getElementById('input-link2-url').value },
            { rotulo: "Website", url: document.getElementById('input-link3-url').value }
        ]
    };

    try {
        const response = await fetch(`${GATEWAY_URL}/perfil/eu`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Erro ao atualizar perfil');

        alert('Perfil atualizado com sucesso!');
        toggleEditForm();
        fetchUserProfile(); 
        carregarLeaderboard(); 
    } catch (error) {
        console.error(error);
        alert('Erro ao guardar alterações.');
    }
});

// Eliminar Perfil
async function deletarPerfil() {
    if (!confirm('Tem certeza de que deseja eliminar o seu perfil? Esta ação não pode ser desfeita.')) return;

    const token = localStorage.getItem('ludarium_token') || '';
    try {
        const response = await fetch(`${GATEWAY_URL}/perfil/eu`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao eliminar perfil');

        localStorage.removeItem('ludarium_token');
        alert('Perfil eliminado com sucesso.');
        window.location.href = `${AUTH_SERVICE_URL}/frontend/login.html`;
    } catch (error) {
        console.error(error);
        alert('Erro ao eliminar o perfil.');
    }
}

async function fetchUserProfile() {
    const token = obterToken();
    try {
        const response = await fetch(`${GATEWAY_URL}/perfil/eu`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erro ao carregar perfil');
        
        const data = await response.json();
        
        // Preencher dados do cabeçalho
        document.getElementById('profile-name').textContent = data.nome;
        document.getElementById('profile-arroba').textContent = data.arroba;
        document.getElementById('profile-location').textContent = `📍 ${data.localizacao}`;
        document.getElementById('profile-bio').textContent = data.biografia;
        document.getElementById('badge-funcao').textContent = data.badge_funcao;
        document.getElementById('profile-level').textContent = data.nivel;
        document.getElementById('profile-xp').textContent = data.xp_atual;
        document.getElementById('profile-xp-next').textContent = data.xp_proximo_nivel;
        
        document.getElementById('stat-seguidores').textContent = data.seguidores_qtd;
        document.getElementById('stat-seguindo').textContent = data.seguindo_qtd;
        document.getElementById('stat-projetos').textContent = data.projetos_qtd;
        document.getElementById('stat-contribuicoes').textContent = data.contribuicoes_anuais;

        // Links
        const linksContainer = document.getElementById('profile-links');
        linksContainer.innerHTML = (data.links || []).map(l => `<a href="${l.url}" target="_blank">🔗 ${l.rotulo}</a>`).join('');

        // Comunidades
        const comContainer = document.getElementById('comunidades-list');
        comContainer.innerHTML = (data.comunidades || []).map(c => `<li style="margin-bottom: 0.5rem; color:#94a3b8;"><strong>${c.nome}</strong> - <span style="font-size:0.8rem">${c.membros}</span></li>`).join('');

        // Troféus
        const trofeusContainer = document.getElementById('trofeus-list');
        trofeusContainer.innerHTML = (data.trofeus || []).map(t => `
            <div style="margin-bottom: 0.8rem; padding: 0.5rem; background: #0f172a; border-radius: 6px; border: 1px solid ${t.concluido ? '#38bdf8' : '#334155'}">
                <strong>${t.concluido ? '🏆' : '🔒'} ${t.titulo}</strong>
                <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #94a3b8;">${t.descricao}</p>
            </div>
        `).join('');

        // Projetos em Destaque
        const projContainer = document.getElementById('projetos-destaque-list');
        projContainer.innerHTML = (data.projetos_destaque || []).map(p => `
            <div style="margin-bottom: 1rem; padding: 0.8rem; background: #0f172a; border-radius: 6px; border: 1px solid #334155;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${p.titulo}</strong>
                    <span style="font-size: 0.75rem; background: #1e293b; padding: 0.2rem 0.5rem; border-radius: 4px; color: #38bdf8;">${p.status_badge}</span>
                </div>
                <p style="margin: 0.3rem 0; font-size: 0.85rem; color: #94a3b8;">${p.papel}</p>
                <div style="background: #334155; border-radius: 4px; height: 6px; width: 100%; margin-top: 0.5rem;">
                    <div style="background: #38bdf8; height: 100%; width: ${p.progresso}%; border-radius: 4px;"></div>
                </div>
            </div>
        `).join('');

        // Atividades
        const ativContainer = document.getElementById('atividades-list');
        ativContainer.innerHTML = (data.atividades || []).map(a => `
            <div style="background: #0f172a; padding: 1rem; border-radius: 6px; border: 1px solid #334155;">
                <p style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">${a.descricao}</p>
                <span style="font-size: 0.75rem; color: #64748b;">${a.tempo_atras}</span>
                ${a.comentario_destaque ? `<div style="margin-top: 0.5rem; padding: 0.5rem; background: #1e293b; border-left: 3px solid #38bdf8; font-size: 0.85rem; color: #cbd5e1;">"${a.comentario_destaque}"</div>` : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error(error);
        alert('Erro ao carregar os dados do perfil.');
    }
}

async function carregarLeaderboard() {
    const token = obterToken();
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    try {
        const response = await fetch(`${GATEWAY_URL}/perfil/leaderboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Falha ao carregar o leaderboard.');

        const ranking = await response.json();
        container.innerHTML = '';

        if (!Array.isArray(ranking) || ranking.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; font-size: 0.9rem;">Ainda não há utilizadores no ranking.</p>';
            return;
        }

        let html = '<table style="width: 100%; border-collapse: collapse; text-align: left;">';
        html += '<tr style="border-bottom: 1px solid #3f3d56; color: #a855f7; font-size: 0.85rem;"><th style="padding: 8px;">#</th><th style="padding: 8px;">Utilizador</th><th style="padding: 8px;">Nível</th><th style="padding: 8px; text-align: right;">XP Total</th></tr>';

        ranking.forEach((user, index) => {
            let posicaoEmoji = index + 1;
            if (index === 0) posicaoEmoji = '🥇';
            else if (index === 1) posicaoEmoji = '🥈';
            else if (index === 2) posicaoEmoji = '🥉';

            html += `
                <tr style="border-bottom: 1px solid rgba(63, 61, 86, 0.4); font-size: 0.9rem;">
                    <td style="padding: 10px; font-weight: bold;">${posicaoEmoji}</td>
                    <td style="padding: 10px; color: #fff;">${user.nome || 'Utilizador'} <span style="color: #9ca3af; font-size: 0.8rem;">(@${user.arroba})</span></td>
                    <td style="padding: 10px; color: #d8b4fe;">Nível ${user.nivel}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #10b981;">${user.xp_atual} XP</td>
                </tr>
            `;
        });

        html += '</table>';
        container.innerHTML = html;

    } catch (error) {
        console.error("Erro ao carregar leaderboard:", error);
        container.innerHTML = '<p style="color: #fca5a5; font-size: 0.9rem;">Erro ao carregar o placar de líderes.</p>';
    }
}