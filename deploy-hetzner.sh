#!/bin/bash
# Script de deployment para Hetzner (Windows Git Bash)
# Ejecutar desde Git Bash

SERVER_IP="135.181.37.72"
SERVER_USER="root"
APP_DIR="/opt/indira-store"

echo "🚀 Desplegando Indira Store en Hetzner..."
echo "📝 Se te pedirá la contraseña del servidor: 53403E@@r"
echo ""

# Crear directorio en el servidor
echo "📁 Creando directorio..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"

# Copiar archivos necesarios
echo "📤 Subiendo archivos..."
scp Dockerfile $SERVER_USER@$SERVER_IP:$APP_DIR/
scp docker-compose.yml $SERVER_USER@$SERVER_IP:$APP_DIR/
scp .env $SERVER_USER@$SERVER_IP:$APP_DIR/
# Copy public folder excluding uploads (uploads are persisted via volume)
echo "📤 Subiendo archivos públicos..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR/public/uploads/payment-proofs"
rsync -av --exclude='uploads' public/ $SERVER_USER@$SERVER_IP:$APP_DIR/public/ 2>/dev/null || scp -r public/* $SERVER_USER@$SERVER_IP:$APP_DIR/public/ 2>/dev/null || true
scp -r src $SERVER_USER@$SERVER_IP:$APP_DIR/
scp package.json package-lock.json $SERVER_USER@$SERVER_IP:$APP_DIR/
scp next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs $SERVER_USER@$SERVER_IP:$APP_DIR/
scp .dockerignore $SERVER_USER@$SERVER_IP:$APP_DIR/ 2>/dev/null || true

echo "🐳 Construyendo imagen Docker..."
ssh $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker compose build"

echo "🚀 Iniciando contenedor..."
ssh $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker compose up -d"

echo ""
echo "✅ Deployment completado!"
echo "🌐 Tu app está en: http://$SERVER_IP:3000"