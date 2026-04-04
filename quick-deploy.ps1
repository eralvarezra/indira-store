# Deploy rápido - solo actualiza archivos modificados
param(
    [string]$Files = ""
)

$Server = "root@135.181.37.72"
$AppDir = "/opt/indira-store"

if ($Files -eq "") {
    Write-Host "Uso: .\quick-deploy.ps1 -Files 'archivo1 archivo2'"
    Write-Host "Ejemplo: .\quick-deploy.ps1 -Files 'src/app/page.tsx'"
    exit 1
}

Write-Host "📤 Subiendo: $Files" -ForegroundColor Yellow

foreach ($file in $Files.Split(" ")) {
    scp $file "${Server}:${AppDir}/$file"
}

Write-Host "🔄 Reconstruyendo..." -ForegroundColor Yellow
ssh $Server "cd ${AppDir} && docker compose build --no-cache && docker compose up -d"

Write-Host "✅ Listo!" -ForegroundColor Green