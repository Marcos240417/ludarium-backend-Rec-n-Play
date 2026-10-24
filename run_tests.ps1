# run_tests.ps1 - Executa os testes automatizados de todos os microsserviços do Ludarium

$services = @(
    "services\auth-service",
    "services\servico-de-perfil",
    "services\project-service",
    "services\servico-de-campanhas",
    "services\servico-de-comunidade",
    "services\servico-de-gateway"
)

$failed = 0
$passed = 0

foreach ($service in $services) {
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "A executar testes para: $service" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Cyan

    Push-Location $service
    
    # Executa o pytest utilizando o Python do venv específico de cada microsserviço
    if (Test-Path "venv\Scripts\python.exe") {
        & "venv\Scripts\python.exe" -m pytest -v
    } else {
        python -m pytest -v
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCESSO] Testes passaram em $service" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[FALHA] Testes falharam em $service" -ForegroundColor Red
        $failed++
    }

    Pop-Location
    Write-Host ""
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "RESUMO FINAL DOS TESTES DO LUDARIUM" -ForegroundColor Cyan
Write-Host "Serviços com Sucesso: $passed" -ForegroundColor Green
Write-Host "Serviços com Falhas:   $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "==================================================" -ForegroundColor Cyan


#Para rodarte todos os testes de uma vez só, execute o comando no terminal: .\run_tests.ps1