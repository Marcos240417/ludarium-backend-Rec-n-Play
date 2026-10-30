const AUTH_SERVICE_URL = "http://localhost:8001";
const PROJECT_SERVICE_URL = "http://localhost:8081";
const SERVICO_DE_COMUNIDADE_URL = "http://localhost:8002";
const SERVICO_DE_CAMPANHAS_URL = "http://localhost:8003";
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

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenUrl = urlParams.get('token');
    if (tokenUrl) {
        localStorage.setItem('ludarium_token', tokenUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

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
        window.location.href = 'login.html';
        return '';
    }
    return token;
}

function toggleEditForm() {
    const container = document.getElementById('edit-form-container');
    if (!container) return;

    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';

        const nomeEl = document.getElementById('profile-name');
        const arrobaEl = document.getElementById('profile-arroba');
        const locEl = document.getElementById('profile-location');
        const bioEl = document.getElementById('profile-bio');

        if (nomeEl) document.getElementById('input-nome').value = nomeEl.textContent;
        if (arrobaEl) document.getElementById('input-arroba').value = arrobaEl.textContent;
        if (locEl) document.getElementById('input-localizacao').value = locEl.textContent.replace('📍 ', '');
        if (bioEl) document.getElementById('input-biografia').value = bioEl.textContent;

        const linksNaTela = document.querySelectorAll('#profile-links a');
        if (linksNaTela[0] && document.getElementById('input-link1-url')) document.getElementById('input-link1-url').value = linksNaTela[0].href;
        if (linksNaTela[1] && document.getElementById('input-link2-url')) document.getElementById('input-link2-url').value = linksNaTela[1].href;
        if (linksNaTela[2] && document.getElementById('input-link3-url')) document.getElementById('input-link3-url').value = linksNaTela[2].href;

    } else {
        container.style.display = 'none';
    }
}

const updateForm = document.getElementById('update-form');
if (updateForm) {
    updateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('ludarium_token') || '';
        const submitBtn = updateForm.querySelector('button[type="submit"]');

        const payload = {
            nome: document.getElementById('input-nome').value.trim(),
            arroba: document.getElementById('input-arroba').value.trim(),
            localizacao: document.getElementById('input-localizacao').value.trim(),
            biografia: document.getElementById('input-biografia').value.trim(),
            links: [
                { rotulo: "GitHub", url: document.getElementById('input-link1-url').value.trim() },
                { rotulo: "LinkedIn", url: document.getElementById('input-link2-url').value.trim() },
                { rotulo: "Website", url: document.getElementById('input-link3-url').value.trim() }
            ].filter(l => l.url !== '')
        };

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'A guardar...';
        }

        try {
            const response = await fetch(`${SERVICO_DE_PERFIL_URL}/perfil/eu`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Erro ao atualizar perfil');

            mostrarToast('Perfil atualizado com sucesso!');
            toggleEditForm();
            fetchUserProfile(); 
            carregarLeaderboard(); 
        } catch (error) {
            console.error(error);
            mostrarToast('Erro ao guardar alterações.', 'erro');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Guardar Alterações';
            }
        }
    });
}

async function deletarPerfil() {
    if (!confirm('Tem certeza de que deseja eliminar a sua conta e todos os dados associados permanentemente? Esta ação não pode ser desfeita.')) {
        return;
    }

    const btnEliminar = document.querySelector('button[onclick="deletarPerfil()"]');
    if (btnEliminar) {
        btnEliminar.disabled = true;
        btnEliminar.textContent = '⏳ A eliminar conta e dados...';
        btnEliminar.style.opacity = '0.7';
    }

    const token = localStorage.getItem('ludarium_token') || '';
    try {
        const response = await fetch(`${SERVICO_DE_PERFIL_URL}/perfil/eu`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok && response.status !== 204) {
            throw new Error('Erro ao eliminar a conta no servidor.');
        }

        localStorage.clear();
        sessionStorage.clear();

        mostrarToast('Conta e dados eliminados com sucesso!');
        setTimeout(() => {
            window.location.href = `${AUTH_SERVICE_URL}/frontend/login.html`;
        }, 1500);

    } catch (error) {
        console.error('Erro ao eliminar o perfil:', error);
        mostrarToast('Ocorreu um erro ao tentar apagar a conta.', 'erro');
        
        if (btnEliminar) {
            btnEliminar.disabled = false;
            btnEliminar.textContent = '🗑️ Eliminar Perfil';
            btnEliminar.style.opacity = '1';
        }
    }
}

async function fetchUserProfile() {
    const token = obterToken();
    if (!token) return;

    try {
        const response = await fetch(`${SERVICO_DE_PERFIL_URL}/perfil/eu`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erro ao carregar perfil');
        
        const data = await response.json();
        
        document.getElementById('profile-name').textContent = data.nome || 'Utilizador';
        document.getElementById('profile-arroba').textContent = data.arroba || '@utilizador';
        document.getElementById('profile-location').textContent = data.localizacao ? `📍 ${data.localizacao}` : '📍 Não definida';
        document.getElementById('profile-bio').textContent = data.biografia || 'Sem biografia.';
        document.getElementById('badge-funcao').textContent = data.badge_funcao || 'NOVO MEMBRO';
        document.getElementById('profile-level').textContent = data.nivel || 1;
        document.getElementById('profile-xp').textContent = data.xp_atual || 0;
        document.getElementById('profile-xp-next').textContent = data.xp_proximo_nivel || 1000;
        
        document.getElementById('stat-seguidores').textContent = data.seguidores_qtd || 0;
        document.getElementById('stat-seguindo').textContent = data.seguindo_qtd || 0;
        document.getElementById('stat-projetos').textContent = data.projetos_qtd || 0;
        document.getElementById('stat-contribuicoes').textContent = data.contribuicoes_anuais || 0;

        const linksContainer = document.getElementById('profile-links');
        if (linksContainer) {
            linksContainer.innerHTML = (data.links || []).map(l => `<a href="${l.url}" target="_blank" style="color: #38bdf8; text-decoration: none; margin-right: 15px;">🔗 ${l.rotulo}</a>`).join('');
        }

        const comContainer = document.getElementById('comunidades-list');
        if (comContainer) {
            comContainer.innerHTML = (data.comunidades || []).length > 0 
                ? (data.comunidades || []).map(c => `<li style="margin-bottom: 0.5rem; color:#94a3b8;"><strong>${c.nome}</strong> - <span style="font-size:0.8rem">${c.membros}</span></li>`).join('')
                : '<li style="color: #64748b; font-size: 0.85rem;">Nenhuma comunidade associada.</li>';
        }

        const trofeusContainer = document.getElementById('trofeus-list');
        if (trofeusContainer) {
            trofeusContainer.innerHTML = (data.trofeus || []).length > 0 
                ? (data.trofeus || []).map(t => `
                    <div style="margin-bottom: 0.8rem; padding: 0.5rem; background: #0f172a; border-radius: 6px; border: 1px solid ${t.concluido ? '#38bdf8' : '#334155'}">
                        <strong>${t.concluido ? '🏆' : '🔒'} ${t.titulo}</strong>
                        <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #94a3b8;">${t.descricao}</p>
                    </div>
                `).join('')
                : '<p style="color: #64748b; font-size: 0.85rem;">Nenhum troféu registado.</p>';
        }

        const projContainer = document.getElementById('projetos-destaque-list');
        if (projContainer) {
            projContainer.innerHTML = (data.projetos_destaque || []).length > 0
                ? (data.projetos_destaque || []).map(p => `
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
                `).join('')
                : '<p style="color: #64748b; font-size: 0.85rem;">Nenhum projeto registado.</p>';
        }

        const ativContainer = document.getElementById('atividades-list');
        if (ativContainer) {
            ativContainer.innerHTML = (data.atividades || []).length > 0
                ? (data.atividades || []).map(a => `
                    <div style="background: #0f172a; padding: 1rem; border-radius: 6px; border: 1px solid #334155; margin-bottom: 0.75rem;">
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">${a.descricao}</p>
                        <span style="font-size: 0.75rem; color: #64748b;">${a.tempo_atras}</span>
                        ${a.comentario_destaque ? `<div style="margin-top: 0.5rem; padding: 0.5rem; background: #1e293b; border-left: 3px solid #38bdf8; font-size: 0.85rem; color: #cbd5e1;">"${a.comentario_destaque}"</div>` : ''}
                    </div>
                `).join('')
                : '<p style="color: #64748b; font-size: 0.85rem;">Nenhuma atividade recente.</p>';
        }

    } catch (error) {
        console.error(error);
        mostrarToast('Erro ao carregar os dados do perfil.', 'erro');
    }
}

async function carregarLeaderboard() {
    const token = obterToken();
    if (!token) return;

    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    try {
        const response = await fetch(`${SERVICO_DE_PERFIL_URL}/perfil/leaderboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Falha ao carregar o leaderboard.');

        const ranking = await response.json();
        container.innerHTML = '';

        if (!Array.isArray(ranking) || ranking.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; font-size: 0.9rem; padding: 10px;">Ainda não há utilizadores no ranking.</p>';
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
        container.innerHTML = '<p style="color: #fca5a5; font-size: 0.9rem; padding: 10px;">Erro ao carregar o placar de líderes.</p>';
    }
}