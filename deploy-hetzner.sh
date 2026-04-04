#!/bin/bash
# Script de deployment para Hetzner
# Ejecutar desde tu computadora local

SERVER_IP="TU_IP_HETZNER"
SERVER_USER="root"
APP_DIR="/opt/indira-store"

echo "🚀 Desplegando Indira Store en Hetzner..."

# Crear directorio en el servidor
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"

# Copiar archivos necesarios
echo "📤 Subiendo archivos..."
scp Dockerfile $SERVER_USER@$SERVER_IP:$APP_DIR/
scp docker-compose.yml $SERVER_USER@$SERVER_IP:$APP_DIR/
scp -r public $SERVER_USER@$SERVER_IP:$APP_DIR/
scp -r src $SERVER_USER@$SERVER_IP:$APP_DIR/
scp package.json package-lock.json $SERVER_USER@$SERVER_IP:$APP_DIR/
scp next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs $SERVER_USER@$SERVER_IP:$APP_DIR/
scp .dockerignore $SERVER_USER@$SERVER_IP:$APP_DIR/

echo "🐳 Construyendo imagen Docker..."
ssh $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker compose build"

echo "🚀 Iniciando contenedor..."
ssh $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker compose up -d"

echo "✅ Deployment completado!"
echo "🌐 Tu app está en: http://$SERVER_IP:3000"