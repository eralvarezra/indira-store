# Deploy script for Indira Store
# Run from PowerShell in the project folder

param(
    [string]$Server = "root@135.181.37.72",
    [string]$AppDir = "/opt/indira-store"
)

Write-Host "Starting deploy..." -ForegroundColor Green

# Check if we are in the correct directory
if (-not (Test-Path "Dockerfile")) {
    Write-Host "Error: Run this script from the project folder" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading files..." -ForegroundColor Yellow

# Upload main files
scp Dockerfile docker-compose.yml .dockerignore package.json package-lock.json next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs "${Server}:${AppDir}/"

# Upload folders
scp -r public src "${Server}:${AppDir}/"

# Upload .env if exists
if (Test-Path ".env") {
    scp .env "${Server}:${AppDir}/"
}

Write-Host "Rebuilding Docker container..." -ForegroundColor Yellow

# Run commands on server
ssh $Server @"
    cd ${AppDir}
    docker compose build --no-cache
    docker compose up -d
    docker system prune -f
"@

Write-Host "Deploy completed!" -ForegroundColor Green
Write-Host "Your app is at: https://indirastore.online" -ForegroundColor Cyan