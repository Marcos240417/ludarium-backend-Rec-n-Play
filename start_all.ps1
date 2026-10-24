# Script para iniciar todos os microsserviços do Ludarium em simultâneo
Write-Host "A iniciar todos os microsserviços do Ludarium..." -ForegroundColor Cyan

# 1. Auth / Gateway Service (Porta 8001)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/auth-service; .\venv\Scripts\Activate; uvicorn main:app --reload --port 8001"

# 2. Project Service (Porta 8081)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/project-service; .\venv\Scripts\Activate; uvicorn main:app --reload --port 8081"

# 3. Servico de Comunidade (Porta 8002)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/servico-de-comunidade; .\venv\Scripts\Activate; uvicorn main:app --reload --port 8002"

# 4. Servico de Campanhas (Porta 8003)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/servico-de-campanhas; .\venv\Scripts\Activate; uvicorn main:app --reload --port 8003"

# 5. Servico de Perfil (Porta 8004)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/servico-de-perfil; .\venv\Scripts\Activate; uvicorn main:app --reload --port 8004"

# 6. Servico de Gateway (Porta 8005)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/servico-de-gateway; .\venv\Scripts\Activate; uvicorn main:app --reload --port 8005"

Write-Host "Todos os serviços foram disparados em janelas separadas!" -ForegroundColor Green

#Comando no terminal para ativar todas as pastas virtuais de uma vez só lugar: .\start_all.ps1 