# Dockerfile para DigitalOcean Droplet
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# Imagen de producción
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar archivos necesarios
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Puerto
EXPOSE 3000

# Iniciar
CMD ["node", "server.js"]