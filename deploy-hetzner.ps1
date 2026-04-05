# Script de deployment para Hetzner (Windows PowerShell)
# Ejecutar desde PowerShell

$SERVER_IP = "135.181.37.72"
$SERVER_USER = "root"
$SERVER_PASS = "53403E@@r"
$APP_DIR = "/opt/indira-store"

Write-Host "🚀 Desplegando Indira Store en Hetzner..." -ForegroundColor Green

# Crear directorio en el servidor
Write-Host "📁 Creando directorio en el servidor..." -ForegroundColor Yellow
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR" 2>&1

# Copiar archivos necesarios
Write-Host "📤 Subiendo archivos..." -ForegroundColor Yellow
scp Dockerfile ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/
scp docker-compose.yml ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/
scp .env ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/
scp -r public ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/
scp -r src ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/
scp package.json package-lock.json ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/
scp next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/
scp .dockerignore ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/ 2>$null

Write-Host "🐳 Construyendo imagen Docker..." -ForegroundColor Yellow
ssh $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker compose build"

Write-Host "🚀 Iniciando contenedor..." -ForegroundColor Yellow
ssh $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker compose up -d"

Write-Host "✅ Deployment completado!" -ForegroundColor Green
Write-Host "🌐 Tu app está en: http://$SERVER_IP:3000" -ForegroundColor Cyan