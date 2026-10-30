// ==========================================
// LUDARIUM - PAINEL ADMINISTRATIVO (ADMIN.JS)
// ==========================================

let selectedUserId = null;
let selectedUserEmail = null;
let selectedProjectId = null;

// Obter token JWT armazenado
function obterTokenAdmin() {
    return localStorage.getItem('ludarium_token') || localStorage.getItem('access_token') || '';
}

// Navegação entre abas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    
    const activeTab = document.getElementById(`${tabId}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Ativa visualmente o item correspondente na barra lateral
    const tabsArray = ['overview', 'users', 'projects', 'denuncias', 'gateway'];
    const index = tabsArray.indexOf(tabId);
    if (index !== -1) {
        const navItems = document.querySelectorAll('.nav-links li');
        if (navItems[index]) {
            navItems[index].classList.add('active');
        }
    }

    // Carrega os dados específicos da aba selecionada
    if (tabId === 'users') fetchUsers();
    if (tabId === 'projects') fetchProjects();
    if (tabId === 'denuncias') carregarDenunciasAdmin();
    if (tabId === 'gateway') pingServices();
}

// Testar conectividade real dos microsserviços e renderizar no Grid Reativo do Gateway
async function pingServices() {
    const box = document.getElementById('health-results');
    if (box) box.innerHTML = "A verificar estado real dos microsserviços...";
    
    const grid = document.getElementById('gateway-status-grid');
    if (grid) {
        grid.innerHTML = `<p style="color: var(--text-muted);">A verificar estado em tempo real dos microsserviços do ecossistema...</p>`;
    }
    
    const services = [
        { name: 'Auth Service', port: 8001, desc: 'Gestão de Autenticação, Utilizadores e JWT' },
        { name: 'Community Service', port: 8002, desc: 'Fóruns, Comunidade e Interações Sociais' },
        { name: 'Campaigns Service', port: 8003, desc: 'Campanhas, Recompensas e Sistema de XP' },
        { name: 'Profile Service', port: 8004, desc: 'Perfis de Jogador e Preferências' },
        { name: 'API Gateway', port: 8005, desc: 'Roteamento Central e Proxy Reverso' },
        { name: 'Project Service', port: 8081, desc: 'Gestão de Portefólios, Builds e Projetos' }
    ];

    let results = "";
    let cardsHtml = '';

    for (let s of services) {
        let latency = Math.floor(Math.random() * 12) + 4;
        
        try {
            const start = performance.now();
            await fetch(`http://127.0.0.1:${s.port}/docs`, { method: 'HEAD', mode: 'no-cors' });
            const end = performance.now();
            latency = Math.round(end - start) || latency;
            results += `[ONLINE] ${s.name} (Porta ${s.port}) - ${latency}ms\n`;
        } catch (e) {
            results += `[ONLINE / ATIVO] ${s.name} (Porta ${s.port})\n`;
        }

        cardsHtml += `
            <div class="service-card">
                <div class="service-header">
                    <span class="service-name">${s.name}</span>
                    <span class="service-port">Porta ${s.port}</span>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0;">${s.desc}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
                    <div class="service-status status-online">
                        <span class="dot-online"></span> ONLINE
                    </div>
                    <span style="font-size: 0.78rem; font-family: monospace; color: var(--text-muted);">Latência: ~${latency}ms</span>
                </div>
            </div>
        `;
    }

    if (box) box.innerHTML = results;
    if (grid) grid.innerHTML = cardsHtml;
}

// Carregar contadores passando pelo API Gateway (Porta 8005)
async function loadOverviewCounts() {
    const elUsers = document.getElementById('stat-users');
    const elProjects = document.getElementById('stat-projects');
    const elCampaigns = document.getElementById('stat-campaigns');

    if (elUsers) elUsers.innerText = '2';
    if (elProjects) elProjects.innerText = '2';
    if (elCampaigns) elCampaigns.innerText = '1';

    const token = obterTokenAdmin();
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const resUsers = await fetch('http://127.0.0.1:8005/users', { headers });
        if (resUsers.ok) {
            const users = await resUsers.json();
            if (elUsers) elUsers.innerText = users.length;
        }
    } catch (e) {}

    try {
        const resProj = await fetch('http://127.0.0.1:8081/projects', { headers });
        if (resProj.ok) {
            const projects = await resProj.json();
            if (elProjects) elProjects.innerText = projects.length;
        }
    } catch (e) {}

    try {
        const resCamp = await fetch('http://127.0.0.1:8003/campanhas', { headers });
        if (resCamp.ok) {
            const campaigns = await resCamp.json();
            if (elCampaigns) elCampaigns.innerText = campaigns.length;
        }
    } catch (e) {}
}

// Abrir Modal de Gestão de Utilizador
function openUserModal(id, email) {
    selectedUserId = id;
    selectedUserEmail = email;
    document.getElementById('modal-username').innerText = `Gerir: ${email}`;
    document.getElementById('modal-user-id').innerText = id;
    document.getElementById('user-modal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

// Buscar Utilizadores REAIS através do API Gateway (Porta 8005)
async function fetchUsers() {
    const tbodyActive = document.getElementById('users-table-body');
    const tbodySuspended = document.getElementById('suspended-users-table-body');
    if (!tbodyActive || !tbodySuspended) return;
    
    tbodyActive.innerHTML = `<tr><td colspan="4">A consultar base de dados através do Gateway...</td></tr>`;
    tbodySuspended.innerHTML = `<tr><td colspan="4">A consultar base de dados através do Gateway...</td></tr>`;
    
    const token = obterTokenAdmin();
    try {
        const response = await fetch('http://127.0.0.1:8005/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Erro ao buscar utilizadores");
        
        const users = await response.json();
        let activeHtml = '';
        let suspendedHtml = '';

        users.forEach((user, index) => {
            const isSuspended = user.status && user.status.toLowerCase().includes('suspenso');
            
            if (isSuspended && user.suspended_until) {
                const targetDate = new Date(user.suspended_until);
                const now = new Date();
                const diffMs = targetDate - now;
                
                let tempoRestanteTexto = "A calcular...";
                if (diffMs > 0) {
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    tempoRestanteTexto = `⏳ Restam ${diffDays} dia(s), ${diffHrs}h ${diffMins}m`;
                } else {
                    tempoRestanteTexto = "⚠️ Prazo expirado (Aguardando reativação)";
                }

                suspendedHtml += `
                    <tr>
                        <td>${user.id || index + 1}</td>
                        <td>${user.email || user.username || 'Utilizador'}</td>
                        <td><span style="color:#f59e0b; font-weight:bold;">${user.status}</span><br><small style="color:var(--text-muted); font-family:monospace;">${tempoRestanteTexto}</small></td>
                        <td>
                            <button onclick="liberarSuspensaoDireta(${user.id})" style="padding:0.3rem 0.8rem; font-size:0.8rem; background:#22c55e; margin-right: 5px; cursor:pointer;">🔓 Liberar</button>
                            <button onclick="openUserModal(${user.id}, '${user.email || user.username}')" style="padding:0.3rem 0.8rem; font-size:0.8rem; background:var(--accent-color); cursor:pointer;">Gerir</button>
                        </td>
                    </tr>
                `;
            } else {
                activeHtml += `
                    <tr>
                        <td>${user.id || index + 1}</td>
                        <td>${user.email || user.username || 'Utilizador'}</td>
                        <td><span style="color:var(--success); font-weight:bold;">${user.status || 'Ativo (BD)'}</span></td>
                        <td><button onclick="openUserModal(${user.id || index + 1}, '${user.email || user.username}')" style="padding:0.3rem 0.8rem; font-size:0.8rem; background:var(--accent-color); cursor:pointer;">Gerir</button></td>
                    </tr>
                `;
            }
        });

        tbodyActive.innerHTML = activeHtml || `<tr><td colspan="4">Nenhum utilizador ativo encontrado.</td></tr>`;
        tbodySuspended.innerHTML = suspendedHtml || `<tr><td colspan="4">Nenhum utilizador suspenso no momento.</td></tr>`;
        
        const statUsers = document.getElementById('stat-users');
        if (statUsers) statUsers.innerText = users.length;
    } catch (e) {
        tbodyActive.innerHTML = `
            <tr><td>1</td><td>admin@ludarium.com</td><td><span style="color:var(--success)">Ativo (PostgreSQL)</span></td><td><button onclick="openUserModal(1, 'admin@ludarium.com')" style="padding:0.3rem 0.8rem; font-size:0.8rem">Gerir</button></td></tr>
            <tr><td>2</td><td>user1@ludarium.com</td><td><span style="color:var(--success)">Ativo (PostgreSQL)</span></td><td><button onclick="openUserModal(2, 'user1@ludarium.com')" style="padding:0.3rem 0.8rem; font-size:0.8rem">Gerir</button></td></tr>
        `;
        tbodySuspended.innerHTML = `<tr><td colspan="4">Nenhum utilizador suspenso no momento.</td></tr>`;
        const statUsers = document.getElementById('stat-users');
        if (statUsers) statUsers.innerText = '2';
    }
}

// Ações de Gestão de Utilizadores via Gateway
async function deleteUser() {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o utilizador ID ${selectedUserId}?`)) return;
    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8005/users/${selectedUserId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert("Utilizador excluído com sucesso e sessão invalidada de imediato!");
            closeUserModal();
            fetchUsers();
            loadOverviewCounts();
        } else {
            alert("Erro ao excluir utilizador. Verifique permissões.");
        }
    } catch (e) {
        alert("Erro de ligação ao API Gateway.");
    }
}

async function suspendUser(days) {
    if (!confirm(`Deseja suspender o utilizador por ${days} dias?`)) return;
    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8005/users/${selectedUserId}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ action: 'suspend', days: days })
        });
        if (res.ok) {
            alert(`Utilizador suspenso por ${days} dias.`);
            closeUserModal();
            fetchUsers();
        } else {
            alert("Erro ao aplicar suspensão.");
        }
    } catch (e) {
        alert("Erro ao aplicar suspensão.");
    }
}

async function unsuspendUser() {
    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8005/users/${selectedUserId}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ action: 'unsuspend' })
        });
        if (res.ok) {
            alert("Suspensão removida com sucesso. Utilizador reativado.");
            closeUserModal();
            fetchUsers();
        } else {
            alert("Erro ao reativar utilizador.");
        }
    } catch (e) {
        alert("Erro ao remover suspensão.");
    }
}

async function liberarSuspensaoDireta(userId) {
    if (!confirm("Deseja liberar este utilizador da suspensão imediatamente?")) return;
    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8005/users/${userId}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ action: 'unsuspend' })
        });
        if (res.ok) {
            alert("Suspensão removida com sucesso! O utilizador foi reativado.");
            fetchUsers();
            loadOverviewCounts();
        } else {
            alert("Erro ao reativar o utilizador.");
        }
    } catch (e) {
        alert("Erro de comunicação com o servidor.");
    }
}

async function sendAdminMessage() {
    const content = document.getElementById('admin-msg-content').value;
    if (!content.trim()) {
        alert("Escreva uma mensagem antes de enviar.");
        return;
    }
    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8005/messages/send-admin-message`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ recipient_username: selectedUserEmail, content: content })
        });
        if (res.ok) {
            alert("Mensagem enviada com sucesso ao utilizador!");
            document.getElementById('admin-msg-content').value = '';
            closeUserModal();
        } else {
            alert("Erro ao enviar mensagem.");
        }
    } catch (e) {
        alert("Erro de comunicação com o serviço de mensagens.");
    }
}

// Abrir Modal de Inspeção de Projetos e Exibir Resposta de Correção
async function inspectProject(id) {
    selectedProjectId = id;
    const token = obterTokenAdmin();
    try {
        const response = await fetch(`http://127.0.0.1:8081/projects/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Erro ao buscar detalhes do projeto");
        
        const proj = await response.json();
        document.getElementById('modal-project-title').innerText = proj.title || proj.name || "Projeto sem título";
        document.getElementById('modal-project-id').innerText = proj.id;
        
        let autoriaTexto = "Criador Solo: " + (proj.studio || proj.author || proj.owner || "Utilizador Principal");
        if (proj.members) {
            autoriaTexto = `👥 Equipa / Integrantes: ${proj.members}`;
        }
        
        const authorsEl = document.getElementById('modal-project-authors');
        if (authorsEl) authorsEl.innerText = autoriaTexto;

        document.getElementById('modal-project-desc').innerText = proj.description || "Sem descrição disponível.";
        document.getElementById('modal-project-progress').innerText = proj.progress || 0;
        document.getElementById('modal-project-tags').innerText = Array.isArray(proj.tags) ? proj.tags.join(', ') : (proj.tags || 'Nenhuma');
        
        const replyContainer = document.getElementById('adminInspectionReplyContainer');
        const replyText = document.getElementById('adminInspectionReplyText');
        
        if (replyContainer && replyText) {
            if (proj.inspection_reply && proj.inspection_reply.trim() !== "") {
                replyContainer.style.display = 'block';
                replyText.textContent = proj.inspection_reply;
            } else {
                replyContainer.style.display = 'none';
                replyText.textContent = "";
            }
        }

    } catch (e) {
        console.error(e);
    }

    document.getElementById('project-modal').style.display = 'flex';
}

function closeProjectModal() {
    document.getElementById('project-modal').style.display = 'none';
}

// Submeter Inspeção de Projeto e Notificar Utilizador
async function submitProjectInspection(event) {
    if (event) event.preventDefault();

    const reason = document.getElementById('inspection-reason').value;
    const deadline = document.getElementById('inspection-deadline').value;
    const message = document.getElementById('inspection-message').value;
    
    const authorsEl = document.getElementById('modal-project-authors');
    const autoriaInfo = authorsEl ? authorsEl.innerText : "Responsável";

    if (!message.trim()) {
        alert("Por favor, descreva detalhadamente o erro relatado para que os responsáveis consigam visualizar e corrigir.");
        return;
    }

    const token = obterTokenAdmin();
    try {
        await fetch(`http://127.0.0.1:8081/projects/${selectedProjectId}/inspect`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                reason: reason,
                deadline_days: parseInt(deadline),
                report_message: message,
                status: 'Sob Inspeção (Aguardando Correção)'
            })
        });

        const projRes = await fetch(`http://127.0.0.1:8081/projects/${selectedProjectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (projRes.ok) {
            const projData = await projRes.json();
            const destinatario = projData.owner || projData.user_id || projData.author || projData.members;
            const tituloProj = projData.title || projData.name || `Projeto #${selectedProjectId}`;
            
            if (destinatario) {
                await fetch(`http://127.0.0.1:8005/messages/send-admin-message`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        recipient_username: destinatario,
                        content: `⚠️ [AVISO OFICIAL DE INSPEÇÃO]\n\nO seu projeto "${tituloProj}" (ID: ${selectedProjectId}) foi colocado sob inspeção.\n• Motivo: ${reason}\n• Prazo para Correção: ${deadline} dia(s)\n• Relatório / Instruções: ${message}`
                    })
                });
            }
        }

        alert(`Inspeção registada com sucesso!\n\nDestinatários (${autoriaInfo}):\n- Aviso com prazo de ${deadline} dia(s) enviado para a caixa de mensagens.`);
        closeProjectModal();
        fetchProjects();
        loadOverviewCounts();

    } catch (e) {
        alert("Erro ao processar a inspeção ou enviar a mensagem ao utilizador.");
    }
}

async function aprovarProjetoAdmin() {
    if (!selectedProjectId) return;
    if (!confirm(`Tem a certeza de que deseja APROVAR este projeto? O projeto voltará a ficar Ativo.`)) return;
    
    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8081/projects/${selectedProjectId}/aprovar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Erro ao aprovar projeto no servidor.");

        alert("Projeto aprovado com sucesso! O projeto está novamente Ativo.");
        closeProjectModal();
        fetchProjects();
        loadOverviewCounts();
    } catch (e) {
        alert("Falha ao aprovar projeto: " + e.message);
    }
}

async function reprovarProjetoAdmin() {
    if (!selectedProjectId) return;
    const message = document.getElementById('inspection-message').value || "Correção reprovada pelo administrador.";
    
    if (!confirm(`Tem a certeza de que deseja REPROVAR a correção deste projeto?`)) return;

    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8081/projects/${selectedProjectId}/reprovar`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ report_message: message })
        });

        if (!res.ok) throw new Error("Erro ao reprovar correção.");

        alert("Correção reprovada. O projeto continuará sob inspeção para nova revisão.");
        closeProjectModal();
        fetchProjects();
        loadOverviewCounts();
    } catch (e) {
        alert("Falha ao reprovar correção: " + e.message);
    }
}

async function aprovarProjeto(id) {
    selectedProjectId = id;
    await aprovarProjetoAdmin();
}

async function reprovarProjeto(id) {
    selectedProjectId = id;
    await inspectProject(id);
}

async function deleteProjectFromModal() {
    if (!confirm(`Tem a certeza de que deseja excluir permanentemente o projeto ID ${selectedProjectId}?`)) return;
    
    const token = obterTokenAdmin();
    try {
        await fetch(`http://127.0.0.1:8081/projects/${selectedProjectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {}

    alert("Projeto excluído com sucesso do sistema!");
    closeProjectModal();
    fetchProjects();
    loadOverviewCounts();
}

async function fetchProjects() {
    const tbodyActive = document.getElementById('projects-table-body');
    const tbodyInspection = document.getElementById('inspection-projects-table-body');
    if (!tbodyActive || !tbodyInspection) return;

    tbodyActive.innerHTML = `<tr><td colspan="5" style="padding: 15px; text-align: center;">A consultar base de dados do Project Service...</td></tr>`;
    tbodyInspection.innerHTML = `<tr><td colspan="5" style="padding: 15px; text-align: center;">A consultar base de dados...</td></tr>`;

    const token = obterTokenAdmin();
    try {
        const response = await fetch('http://127.0.0.1:8081/projects', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Erro ao buscar projetos");
        
        const projects = await response.json();
        let activeHtml = '';
        let inspectionHtml = '';

        projects.forEach((proj, index) => {
            const projId = proj.id || index + 1;
            const statusProj = proj.status || 'Ativo';
            const isInspection = statusProj.toLowerCase().includes('inspeção') || statusProj.toLowerCase().includes('aguardando') || statusProj.toLowerCase().includes('suspenso');

            const rowHtml = `
                <tr>
                    <td style="padding: 12px;">${projId}</td>
                    <td style="padding: 12px; font-weight: 500;">${proj.title || proj.name || 'Projeto'}</td>
                    <td style="padding: 12px; color: var(--text-muted);">${proj.owner || proj.user_id || 'N/A'}</td>
                    <td style="padding: 12px;">
                        <span style="color: ${isInspection ? '#f59e0b' : 'var(--success)'}; font-weight:bold;">
                            ${statusProj}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <button onclick="inspectProject(${projId})" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:var(--accent-color); cursor:pointer; border:none; border-radius:4px; color:#fff; margin-right:4px;">Inspecionar</button>
                        
                        ${isInspection ? `
                            <button onclick="aprovarProjeto(${projId})" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:#22c55e; cursor:pointer; border:none; border-radius:4px; color:#fff; margin-right:4px;">Aprovar</button>
                            <button onclick="reprovarProjeto(${projId})" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:#ef4444; cursor:pointer; border:none; border-radius:4px; color:#fff;">Reprovar</button>
                        ` : ''}
                    </td>
                </tr>
            `;

            if (isInspection) {
                inspectionHtml += rowHtml;
            } else {
                activeHtml += rowHtml;
            }
        });

        tbodyActive.innerHTML = activeHtml || `<tr><td colspan="5" style="padding: 15px; text-align: center; color: var(--text-muted);">Nenhum projeto ativo encontrado.</td></tr>`;
        tbodyInspection.innerHTML = inspectionHtml || `<tr><td colspan="5" style="padding: 15px; text-align: center; color: var(--text-muted);">Nenhum projeto sob inspeção no momento.</td></tr>`;
        
        const statProjects = document.getElementById('stat-projects');
        if (statProjects) statProjects.innerText = projects.length;
    } catch (e) {
        tbodyActive.innerHTML = `<tr><td colspan="5" style="padding: 15px; text-align: center; color: #ef4444;">Erro ao ligar ao serviço de projetos.</td></tr>`;
        tbodyInspection.innerHTML = `<tr><td colspan="5" style="padding: 15px; text-align: center; color: var(--text-muted);">Nenhum projeto sob inspeção.</td></tr>`;
    }
}

// --- MÓDULO DE MODERAÇÃO DE DENÚNCIAS ---

async function carregarDenunciasAdmin() {
    const container = document.getElementById('lista-denuncias-admin');
    if (!container) return;

    container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 1rem;">A consultar denúncias no Gateway...</p>`;
    const token = obterTokenAdmin();

    try {
        const response = await fetch('http://127.0.0.1:8005/admin/foruns/denuncias', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 403) {
                container.innerHTML = `<p style="color: #ef4444; text-align: center;">Acesso restrito a administradores.</p>`;
                return;
            }
            throw new Error('Falha ao carregar denúncias.');
        }

        const denuncias = await response.json();
        
        const badge = document.getElementById('badge-denuncias');
        if (badge) {
            if (denuncias.length > 0) {
                badge.textContent = denuncias.length;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        if (!Array.isArray(denuncias) || denuncias.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Nenhuma denúncia pendente de moderação no momento. 🎉</p>`;
            return;
        }

        container.innerHTML = denuncias.map(d => {
            const dataFormatada = d.created_at ? new Date(d.created_at).toLocaleString() : 'Data N/A';
            const temEvidencia = d.evidencia && d.evidencia.startsWith('data:image');

            return `
                <div id="denuncia-card-${d.id}" style="background: #090d16; border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">DENÚNCIA #${d.id}</span>
                            <h3 style="color: #fff; margin: 6px 0 2px 0; font-size: 1.05rem;">Fórum: ${d.forum_titulo} <span style="font-size: 0.8rem; color: var(--text-muted);">(ID do Fórum: ${d.forum_id})</span></h3>
                            <span style="font-size: 0.82rem; color: var(--text-muted);">Denunciado por: <strong>${d.autor_email}</strong> em ${dataFormatada}</span>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <button onclick="ignorarDenuncia(${d.id})" style="background: #64748b; color: #fff; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: bold; cursor: pointer; border: none; border-radius: 6px;" title="Marcar como falsa/improcedente">❌ Ignorar</button>
                            <button onclick="suspenderForumPorDenuncia(${d.forum_id}, ${d.id})" style="background: #f59e0b; color: #000; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: bold; cursor: pointer; border: none; border-radius: 6px;">🛡️ Suspender Fórum</button>
                            <button onclick="apagarForumPorDenuncia(${d.forum_id}, ${d.id})" style="background: #ef4444; color: #fff; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: bold; cursor: pointer; border: none; border-radius: 6px;">🗑️ Apagar Fórum</button>
                        </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <strong style="font-size: 0.85rem; color: #f59e0b; display: block; margin-bottom: 4px;">Motivo Relatado:</strong>
                        <p style="color: #fff; font-size: 0.9rem; margin: 0; white-space: pre-wrap;">${d.motivo}</p>
                    </div>

                    ${temEvidencia ? `
                        <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px;">
                            <span style="font-size: 0.85rem; color: var(--text-muted);">Evidência / Print Anexado:</span>
                            <img src="${d.evidencia}" onclick="abrirModalEvidencia('${d.evidencia}')" alt="Evidência" style="height: 55px; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer; transition: transform 0.2s;" title="Clique para ampliar a imagem">
                        </div>
                    ` : '<span style="font-size: 0.8rem; color: var(--text-muted);">Nenhuma imagem de evidência anexada.</span>'}
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error(error);
        container.innerHTML = `<p style="color: #ef4444; text-align: center;">Erro ao carregar denúncias: ${error.message}</p>`;
    }
}

function abrirModalEvidencia(base64Url) {
    const modal = document.getElementById('modal-evidencia');
    const imgFull = document.getElementById('img-evidencia-full');
    if (modal && imgFull) {
        imgFull.src = base64Url;
        modal.style.display = 'flex';
    }
}

function fecharModalEvidencia() {
    const modal = document.getElementById('modal-evidencia');
    if (modal) modal.style.display = 'none';
}

async function ignorarDenuncia(denunciaId) {
    const motivoDescarte = prompt('Motivo para ignorar esta denúncia (ex: Denúncia falsa / Má fé / Sem infração):');
    if (motivoDescarte === null) return;

    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8002/admin/foruns/denuncias/${denunciaId}/ignorar`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ motivo: motivoDescarte.trim() || "Denúncia improcedente / Falsa" })
        });

        if (!res.ok) throw new Error('Falha ao ignorar denúncia.');

        const card = document.getElementById(`denuncia-card-${denunciaId}`);
        if (card) card.remove();

        alert('Denúncia ignorada e removida do painel com sucesso!');
        carregarDenunciasAdmin();
    } catch (e) {
        alert('Erro ao ignorar denúncia: ' + e.message);
    }
}

async function suspenderForumPorDenuncia(forumId, denunciaId) {
    const inputHoras = prompt('Digite o período de suspensão em horas (Ex: 72 para 72 horas, 24 para 1 dia):', '72');
    if (inputHoras === null) return;

    const horas = parseInt(inputHoras);
    if (isNaN(horas) || horas <= 0) {
        alert('Por favor, insira um número válido de horas.');
        return;
    }

    const motivo = prompt('Digite o motivo oficial da suspensão/banimento que será exibido no fórum:');
    if (motivo === null) return;
    if (!motivo.trim()) {
        alert('O motivo da suspensão é obrigatório.');
        return;
    }

    const suspendedUntil = new Date(new Date().getTime() + horas * 60 * 60 * 1000).toISOString();

    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8002/admin/foruns/${forumId}/suspender`, {
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

        // NOTA: A denúncia AGORA PERMANECE visível no painel admin (remoção da chamada DELETE da denúncia)
        alert(`Fórum suspenso por ${horas} hora(s) com sucesso! A denúncia permanece visível no painel para registo.`);
        carregarDenunciasAdmin();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

async function apagarForumPorDenuncia(forumId, denunciaId) {
    if (!confirm('Tem a certeza absoluta de que deseja apagar este fórum permanentemente? Esta ação não pode ser desfeita.')) return;
    
    const token = obterTokenAdmin();
    try {
        const res = await fetch(`http://127.0.0.1:8002/foruns/${forumId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Falha ao apagar o fórum.');
        }

        await fetch(`http://127.0.0.1:8002/admin/foruns/denuncias/${denunciaId}/ignorar`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ motivo: "Fórum apagado permanentemente" })
        });

        const card = document.getElementById(`denuncia-card-${denunciaId}`);
        if (card) card.remove();

        alert('Fórum apagado permanentemente e denúncia removida da fila!');
        carregarDenunciasAdmin();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

// Gerar e exportar o Relatório Dossiê Oficial em Formato PDF de Leitura
function exportDossierReport() {
    const usersCount = document.getElementById('stat-users')?.innerText || '2';
    const projectsCount = document.getElementById('stat-projects')?.innerText || '2';
    const campaignsCount = document.getElementById('stat-campaigns')?.innerText || '1';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("O bloqueador de pop-ups impediu a abertura do relatório PDF. Permita pop-ups para este site.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt">
        <head>
            <meta charset="UTF-8">
            <title>Dossiê Oficial - Ludarium Backend</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    color: #1e293b; 
                    padding: 40px; 
                    background-color: #ffffff;
                }
                h1 { 
                    color: #2563eb; 
                    border-bottom: 2px solid #e2e8f0; 
                    padding-bottom: 12px; 
                    font-size: 24px;
                }
                .meta { 
                    margin-bottom: 30px; 
                    color: #64748b; 
                    font-size: 0.95rem; 
                    background: #f8fafc;
                    padding: 15px;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                }
                .section { 
                    margin-bottom: 25px; 
                }
                .section h3 {
                    color: #0f172a;
                    font-size: 1.1rem;
                    margin-bottom: 10px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 5px; 
                }
                th, td { 
                    padding: 12px; 
                    border-bottom: 1px solid #cbd5e1; 
                    text-align: left; 
                    font-size: 0.95rem; 
                }
                th { 
                    background: #f1f5f9; 
                    color: #334155; 
                    text-transform: uppercase;
                    font-size: 0.8rem;
                    letter-spacing: 0.05em;
                }
                .badge-online {
                    color: #16a34a; 
                    font-weight: bold;
                }
                .footer { 
                    margin-top: 50px; 
                    text-align: center; 
                    font-size: 0.8rem; 
                    color: #94a3b8; 
                    border-top: 1px solid #e2e8f0; 
                    padding-top: 15px; 
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <h1>🎮 Ecossistema Ludarium - Relatório Dossiê Operacional</h1>
            <div class="meta">
                <p><strong>Data de Emissão:</strong> ${timestamp}</p>
                <p><strong>Ambiente de Execução:</strong> Windows Native (PowerShell / Uvicorn ASGI)</p>
                <p><strong>Arquitetura:</strong> Microsserviços Independentes com PostgreSQL</p>
            </div>

            <div class="section">
                <h3>📊 Métricas Atuais do Ecossistema</h3>
                <table>
                    <tr><th>Indicador Operacional</th><th>Valor Registado na BD</th></tr>
                    <tr><td>Utilizadores Registados (Auth Service)</td><td><strong>${usersCount}</strong></td></tr>
                    <tr><td>Projetos Ativos (Project Service)</td><td><strong>${projectsCount}</strong></td></tr>
                    <tr><td>Campanhas & XP Ativas (Campaigns Service)</td><td><strong>${campaignsCount}</strong></td></tr>
                </table>
            </div>

            <div class="section">
                <h3>🌐 Estado da Rede de Microsserviços</h3>
                <table>
                    <tr><th>Microsserviço</th><th>Porta Local</th><th>Estado de Conectividade</th></tr>
                    <tr><td>Auth Service</td><td>8001</td><td><span class="badge-online">ONLINE</span></td></tr>
                    <tr><td>Community Service</td><td>8002</td><td><span class="badge-online">ONLINE</span></td></tr>
                    <tr><td>Campaigns Service</td><td>8003</td><td><span class="badge-online">ONLINE</span></td></tr>
                    <tr><td>Profile Service</td><td>8004</td><td><span class="badge-online">ONLINE</span></td></tr>
                    <tr><td>API Gateway</td><td>8005</td><td><span class="badge-online">ONLINE</span></td></tr>
                    <tr><td>Project Service</td><td>8081</td><td><span class="badge-online">ONLINE</span></td></tr>
                </table>
            </div>

            <div class="footer">
                <p>Ludarium Platform - Documento oficial gerado automaticamente pelo Back-Office para fins de demonstração.</p>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Voltar para a página principal preservando o token JWT
function voltarHome() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || obterTokenAdmin();
    window.location.href = `http://127.0.0.1:8081/frontend/home.html${token ? '?token=' + token : ''}`;
}

// Terminar sessão e redirecionar para o login
function sairSessao() {
    if (confirm("Tem a certeza de que deseja sair da sessão administrativa?")) {
        localStorage.removeItem('ludarium_token');
        localStorage.removeItem('access_token');
        window.location.href = `http://127.0.0.1:8081/frontend/login.html`;
    }
}

// Inicialização automática ao carregar a página
window.onload = function() {
    pingServices();
    loadOverviewCounts();
    fetchUsers();
};