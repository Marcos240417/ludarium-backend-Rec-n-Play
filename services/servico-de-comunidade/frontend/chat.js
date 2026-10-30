// Caminho: frontend/chat.js
const GATEWAY_URL = "http://localhost:8005";

let chatAtual = { tipo: null, id: null, nome: '' };
let intervaloAtualizacao = null;

function obterToken() {
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token') || localStorage.getItem('ludarium_token');
    if (!token) {
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMSIsImV4cCI6MTc5Mjg3NTk3Nn0.8Kiajoqmtvmdt6ypcfUOGLwSEIPXmRC7ZNgU0_zpvNI";
        localStorage.setItem('ludarium_token', token);
    }
    return token;
}

function obterUtilizadorEmailAtual() {
    const token = obterToken();
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);
        return payload.sub || payload.email || "user1@ludarium.com";
    } catch (e) {
        return "user1@ludarium.com";
    }
}

function obterUtilizadorAtualNome() {
    const email = obterUtilizadorEmailAtual();
    return email ? email.split('@')[0] : 'user1';
}

document.addEventListener("DOMContentLoaded", () => {
    carregarConversasEGrupos();
    // Atualizar mensagens ativas a cada 4 segundos
    setInterval(() => {
        if (chatAtual.tipo) {
            carregarMensagensChatAtual(false);
        }
    }, 4000);
});

async function carregarConversasEGrupos() {
    const token = obterToken();
    const listaEl = document.getElementById('lista-conversas');
    if (!listaEl) return;
    listaEl.innerHTML = '<div style="padding: 1rem; color: #94a3b8; font-size: 0.85rem;">A carregar conversas...</div>';

    try {
        // 1. Carregar Mensagens Diretas / Pessoais
        const resMsg = await fetch(`${GATEWAY_URL}/messages/my-messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const mensagens = await resMsg.json();

        // 2. Carregar Grupos de Equipa
        const resGrupos = await fetch(`${GATEWAY_URL}/grupos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const grupos = await resGrupos.json();

        listaEl.innerHTML = '';

        // Secção de Grupos
        if (Array.isArray(grupos) && grupos.length > 0) {
            const tituloGrupo = document.createElement('div');
            tituloGrupo.style.cssText = "padding: 6px 12px; font-size: 0.75rem; color: #64748b; font-weight: bold; background: #121520;";
            tituloGrupo.textContent = "EQUIPAS & PROJETOS";
            listaEl.appendChild(tituloGrupo);

            grupos.forEach(g => {
                const item = document.createElement('div');
                item.className = 'chat-item';
                item.style.cssText = "padding: 10px 12px; border-bottom: 1px solid #2a2e43; cursor: pointer; transition: background 0.2s;";
                item.innerHTML = `
                    <div style="font-weight: bold; color: white; font-size: 0.9rem;">👥 ${g.nome}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${g.descricao}</div>
                `;
                item.onclick = () => selecionarChat('grupo', g.id, g.nome, item);
                listaEl.appendChild(item);
            });
        }

        // Secção de Mensagens Pessoais
        const tituloDireto = document.createElement('div');
        tituloDireto.style.cssText = "padding: 6px 12px; font-size: 0.75rem; color: #64748b; font-weight: bold; background: #121520; margin-top: 10px;";
        tituloDireto.textContent = "CONVERSAS DIRETAS";
        listaEl.appendChild(tituloDireto);

        if (!Array.isArray(mensagens) || mensagens.length === 0) {
            listaEl.innerHTML += '<div style="padding: 1rem; color: #64748b; font-size: 0.85rem;">Sem conversas diretas.</div>';
        } else {
            const remetentesUnicos = [...new Set(mensagens.map(m => m.sender_username))];

            remetentesUnicos.forEach(remetente => {
                const ultimaMsg = mensagens.filter(m => m.sender_username === remetente).pop();
                const item = document.createElement('div');
                item.className = 'chat-item';
                item.style.cssText = "padding: 10px 12px; border-bottom: 1px solid #2a2e43; cursor: pointer; transition: background 0.2s;";
                item.innerHTML = `
                    <div style="font-weight: bold; color: white; font-size: 0.9rem;">👤 ${remetente}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ultimaMsg ? ultimaMsg.content : ''}</div>
                `;
                item.onclick = () => selecionarChat('direto', remetente, remetente, item);
                listaEl.appendChild(item);
            });
        }

    } catch (e) {
        listaEl.innerHTML = '<div style="padding: 1rem; color: #ef4444; font-size: 0.85rem;">Erro ao carregar dados.</div>';
    }
}

function selecionarChat(tipo, id, nome, elementoDom) {
    document.querySelectorAll('.chat-item').forEach(el => {
        el.style.background = 'transparent';
        el.classList.remove('active');
    });
    if (elementoDom) {
        elementoDom.style.background = '#252b42';
        elementoDom.classList.add('active');
    }

    chatAtual = { tipo, id, nome };

    const janelaVazia = document.getElementById('chat-janela-vazia');
    const janelaAtiva = document.getElementById('chat-janela-ativa');
    const tituloAtivo = document.getElementById('chat-titulo-ativo');

    if (janelaVazia) janelaVazia.style.display = 'none';
    if (janelaAtiva) janelaAtiva.style.display = 'flex';
    if (tituloAtivo) tituloAtivo.textContent = tipo === 'grupo' ? `👥 Equipa: ${nome}` : `👤 Chat com ${nome}`;

    carregarMensagensChatAtual(true);
}

async function carregarMensagensChatAtual(rolarParaBaixo = false) {
    const token = obterToken();
    const container = document.getElementById('chat-mensagens-container');
    const meuEmail = obterUtilizadorEmailAtual();
    const meuNome = obterUtilizadorAtualNome();
    if (!container) return;

    try {
        if (chatAtual.tipo === 'grupo') {
            const res = await fetch(`${GATEWAY_URL}/grupos/${chatAtual.id}/mensagens`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const msgs = await res.json();
            
            container.innerHTML = msgs.map(m => {
                const meu = m.autor_email === meuEmail || m.autor.toLowerCase() === meuNome.toLowerCase();
                return `
                    <div style="max-width: 70%; align-self: ${meu ? 'flex-end' : 'flex-start'}; background: ${meu ? '#7c3aed' : '#334155'}; color: white; padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; margin-bottom: 0.5rem;">
                        <div style="font-size: 0.75rem; color: #cbd5e1; margin-bottom: 2px; font-weight: bold;">${m.autor}</div>
                        <div>${m.conteudo}</div>
                    </div>
                `;
            }).join('');
        } else if (chatAtual.tipo === 'direto') {
            const res = await fetch(`${GATEWAY_URL}/messages/my-messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const msgs = await res.json();
            const filtradas = msgs.filter(m => m.sender_username.toLowerCase() === chatAtual.nome.toLowerCase());

            container.innerHTML = filtradas.map(m => `
                <div style="max-width: 70%; align-self: flex-start; background: #334155; color: white; padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; margin-bottom: 0.5rem;">
                    <div style="font-size: 0.75rem; color: #cbd5e1; margin-bottom: 2px; font-weight: bold;">${m.sender_username}</div>
                    <div>${m.content}</div>
                </div>
            `).join('');
        }

        if (rolarParaBaixo) {
            container.scrollTop = container.scrollHeight;
        }
    } catch (e) {
        console.error(e);
    }
}

async function enviarMensagemAtual() {
    const token = obterToken();
    const input = document.getElementById('input-mensagem');
    if (!input) return;
    const conteudo = input.value.trim();
    if (!conteudo || !chatAtual.tipo) return;

    try {
        if (chatAtual.tipo === 'grupo') {
            const res = await fetch(`${GATEWAY_URL}/grupos/${chatAtual.id}/mensagens`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ conteudo })
            });
            if (!res.ok) throw new Error('Falha ao enviar mensagem para o grupo.');
        } else if (chatAtual.tipo === 'direto') {
            const res = await fetch(`${GATEWAY_URL}/messages/send-admin-message`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient_username: chatAtual.id, content: conteudo })
            });
            if (!res.ok) throw new Error('Falha ao enviar mensagem direta.');
        }

        input.value = '';
        carregarMensagensChatAtual(true);
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

function verificarEnter(event) {
    if (event.key === 'Enter') {
        enviarMensagemAtual();
    }
}

function abrirModalNovaConversa() {
    const modal = document.getElementById('modal-conversa');
    if (modal) modal.style.display = 'flex';
}

function fecharModalNovaConversa() {
    const modal = document.getElementById('modal-conversa');
    if (modal) modal.style.display = 'none';
}

async function iniciarConversaDireta(event) {
    event.preventDefault();
    const token = obterToken();
    const destinatarioEl = document.getElementById('novo-destinatario-email');
    const conteudoEl = document.getElementById('novo-conteudo-msg');
    
    if (!destinatarioEl || !conteudoEl) return;
    const destinatario = destinatarioEl.value.trim();
    const conteudo = conteudoEl.value.trim();

    try {
        const res = await fetch(`${GATEWAY_URL}/messages/send-admin-message`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_username: destinatario, content: conteudo })
        });

        if (!res.ok) throw new Error('Falha ao enviar mensagem.');

        fecharModalNovaConversa();
        destinatarioEl.value = '';
        conteudoEl.value = '';
        carregarConversasEGrupos();
        alert('Mensagem enviada com sucesso!');
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}