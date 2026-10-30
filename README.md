
# 🚀 Ludaryum Backend

<p align="center">
  <b>Ecossistema digital integrado para gestão de projetos, gamificação, portefólios dinâmicos e colaboração social.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.15-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/FastAPI-0.143+-009688.svg" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL-15%2B-4169E1.svg" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Architecture-Microservices-orange.svg" alt="Architecture">
  <img src="https://img.shields.io/badge/Platform-Windows%20Native-0078D4.svg" alt="Windows Native">
</p>

---

## 📋 Sobre o Projeto

O **Ludarium** é uma plataforma inovadora concebida para unificar o desenvolvimento de projetos tecnológicos, o reconhecimento por mérito através de gamificação (sistema de XP e níveis) e a interação comunitária num único ecossistema coeso. 

O repositório **`ludarium-backend`** implementa a camada de serviços de alta performance em **FastAPI (Python)**, estruturada em microsserviços desacoplados e otimizada para execução 100% nativa em ambiente Windows (sem dependência de contentores Docker ou WSL), garantindo máxima estabilidade e agilidade para apresentações ao vivo, feiras de inovação e utilização em produção.

---

## 🏛️ Arquitetura do Sistema e Microsserviços

O ecossistema divide-se em **seis microsserviços independentes**, comunicando-se de forma relacional via SQLAlchemy e PostgreSQL:

| Microsserviço | Diretório | Porta | Descrição Funcional |
| :--- | :--- | :---: | :--- |
| **API Gateway** | `services/servico-de-gateway` | `8005` | Ponto de entrada unificado, política CORS global e encaminhamento de borda. |
| **Auth Service** | `services/auth-service` | `8001` | Gestão de identidade, autenticação JWT, hashing Bcrypt e mensageria privada. |
| **Community Service** | `services/servico-de-comunidade` | `8002` | Feed social, publicações, comentários e interações entre membros. |
| **Campaigns Service** | `services/servico-de-campanhas` | `8003` | Desafios temáticos, objetivos de gamificação e atribuição automática de XP. |
| **Profile Service** | `services/servico-de-perfil` | `8004` | Perfis detalhados de utilizador, biografia, avatares e estatísticas de progresso. |
| **Project Service** | `services/project-service` | `8081` | Gestão de projetos, repositórios, portefólio e processamento de builds em background. |

---

## 📂 Árvore Estrutural do Repositório

```text
ludarium-backend/
├── start_all.ps1               # Script de orquestração concorrente de processos (PowerShell)
├── run_tests.ps1               # Script global de automação, varredura e execução de testes (pytest)
└── services/                   # Módulos de domínio do ecossistema
    ├── auth-service/           # Serviço de Identidade e Segurança
    ├── servico-de-comunidade/  # Serviço de Feed e Rede Social
    ├── servico-de-campanhas/   # Serviço de Desafios e XP
    ├── servico-de-perfil/      # Serviço de Perfil e Estatísticas
    ├── servico-de-gateway/     # Serviço de Borda (API Gateway)
    └── project-service/        # Serviço de Gestão de Projetos e Builds

```

---

## ⚙️ Pré-requisitos e Tecnologias

Antes de iniciar, certifique-se de que possui os seguintes componentes instalados no seu ambiente Windows:

* **Python 3.10+** (Recomendado Python 3.15+)
* **PostgreSQL 15+** a correr localmente (com bases de dados configuradas para cada microsserviço, ex: `ludarium_auth`, `ludarium_comunidade`, `ludarium_perfil`, etc.)
* **PowerShell** (para execução dos scripts nativos de automação)

---

## 🛠️ Configuração e Instalação Local

Cada microsserviço possui o seu próprio ambiente virtual (`venv`) isolado e dependências específicas. Para configurar o projeto do zero:

1. **Clone o repositório:**
```bash
git clone [https://github.com/SEU-UTILIZADOR/ludarium-backend.git](https://github.com/SEU-UTILIZADOR/ludarium-backend.git)
cd ludarium-backend

```


2. **Crie e configure os ambientes virtuais em cada serviço (exemplo para o Auth Service):**
```bash
cd services/auth-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
deactivate
cd ../..

```


*(Repita o processo de criação de `venv` e instalação de dependências para os restantes diretórios dentro de `services/`).*

---

## 🚀 Execução do Sistema

O repositório disponibiliza um script inteligente em PowerShell na raiz (`start_all.ps1`) que abre e gere todos os microsserviços em simultâneo através de instâncias independentes do Uvicorn.

Para iniciar todo o ecossistema:

1. Abra o **PowerShell** na pasta raiz do projeto.
2. Certifique-se de que a política de execução permite scripts locais (se necessário: `Set-ExecutionPolicy Unrestricted -Scope Process`).
3. Execute o script de arranque:
```powershell
./start_all.ps1

```



---

## 🧪 Testes Automatizados

O sistema conta com um script global de testes na raiz para validar a integridade dos módulos através do `pytest`:

```powershell
./run_tests.ps1

```

---


