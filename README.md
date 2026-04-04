# 🛒 Indira Store

Una aplicación web móvil-first para catálogo de productos con notificaciones de pedidos vía Telegram.

## 📋 Características

- ✅ Catálogo de productos responsivo (mobile-first)
- ✅ Carrito de compras con persistencia local
- ✅ Flujo de checkout simplificado
- ✅ Notificaciones de pedidos vía Telegram
- ✅ Panel de administración seguro
- ✅ CRUD de productos
- ✅ Historial de pedidos
- ✅ Configuración de Telegram desde el admin
- ✅ **Sistema de pre-pedidos** (productos agotados)
- ✅ **Ciclos semanales de pedidos**
- ✅ **Reportes automáticos semanales vía Telegram**

## 🆕 Nuevas Funcionalidades

### Sistema de Pre-pedidos

Los productos pueden tener dos estados:
- **En Stock**: El usuario puede comprar normalmente
- **Agotado (Pre-pedido)**: El usuario puede hacer un pre-pedido que será entregado en ~1.5 semanas

El sistema distingue automáticamente entre pedidos `in_stock` y `pre_order`, mostrando:
- Badges visuales en el carrito
- Indicadores en el checkout
- Notificaciones diferenciadas en Telegram

### Ciclos Semanales

- Cada pedido pertenece a un "ciclo semanal" (Sábado a Viernes)
- El sistema crea automáticamente nuevos ciclos
- Los pedidos se asocian automáticamente al ciclo actual

### Reportes Semanales Automáticos

Cada Viernes a las 23:59, el sistema:
1. Cierra el ciclo actual
2. Genera un reporte con estadísticas
3. Envía el reporte a Telegram
4. Crea un nuevo ciclo para la siguiente semana

El reporte incluye:
- Total de pedidos
- Pedidos en stock vs pre-pedidos
- Productos más vendidos
- Ingresos totales
- Alertas de productos a reordenar

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS) o API Routes
- **Notificaciones**: Telegram Bot API
- **Estado**: React Context + LocalStorage
- **Cron Jobs**: Vercel Cron Jobs / External Scheduler

## 📦 Instalación

### 1. Clonar e instalar dependencias

```bash
cd indira-store
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura tus credenciales:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role_de_supabase

# Telegram
TELEGRAM_BOT_TOKEN=tu_token_del_bot
TELEGRAM_CHAT_ID=tu_chat_id

# Admin
ADMIN_PASSWORD=tu_contraseña_segura
JWT_SECRET=tu_secreto_jwt

# Cron Job (para reportes semanales)
CRON_SECRET=tu_secreto_cron
```

### 3. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a SQL Editor y ejecuta el contenido de `supabase/schema.sql`
3. Obtén tus credenciales en Settings > API

### 4. Configurar Telegram Bot

1. Abre [@BotFather](https://t.me/BotFather) en Telegram
2. Crea un nuevo bot con `/newbot`
3. Copia el token del bot
4. Para obtener el Chat ID:
   - Crea un grupo o canal
   - Añade tu bot como administrador
   - Usa [@userinfobot](https://t.me/userinfobot) para obtener el ID del grupo

### 5. Iniciar el servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 🔐 Acceso Admin

1. Ve a `/admin/login`
2. Ingresa la contraseña configurada en `ADMIN_PASSWORD`
3. Gestiona productos, pedidos y configuración
4. **NUEVO**: Ve a la pestaña "Reportes" para ver estadísticas semanales

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── admin/          # Auth y configuración
│   │   ├── cron/           # Cron jobs (reportes semanales)
│   │   ├── orders/         # API de pedidos
│   │   ├── products/       # API de productos
│   │   └── week-cycles/   # API de ciclos semanales
│   ├── admin/              # Panel de administración
│   └── page.tsx            # Catálogo principal
├── components/
│   ├── cart/               # Componentes del carrito
│   ├── checkout/           # Modal de checkout
│   └── product/            # Tarjetas de producto
├── context/
│   └── CartContext.tsx     # Estado global del carrito
├── lib/
│   ├── demo-store.ts       # Store en memoria (demo mode)
│   └── supabase/           # Clientes de Supabase
└── types/
    └── database.types.ts   # Tipos TypeScript
```

## 🗄️ Base de Datos

### Tabla: products
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único |
| name | VARCHAR | Nombre del producto |
| description | TEXT | Descripción |
| price | DECIMAL | Precio |
| image_url | TEXT | URL de imagen |
| stock | INTEGER | Cantidad disponible |
| discount_percentage | INTEGER | Descuento (0-100) |
| category | VARCHAR | Categoría del producto |
| created_at | TIMESTAMP | Fecha de creación |

### Tabla: orders
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único |
| customer_name | VARCHAR | Nombre del cliente |
| phone | VARCHAR | Teléfono |
| items | JSONB | Productos del pedido (con tipo: in_stock/pre_order) |
| total | DECIMAL | Total del pedido |
| status | VARCHAR | Estado (pending/confirmed/cancelled) |
| week_cycle_id | UUID | Referencia al ciclo semanal |
| created_at | TIMESTAMP | Fecha del pedido |

### Tabla: week_cycles
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único |
| start_date | TIMESTAMP | Fecha de inicio (Sábado 00:00) |
| end_date | TIMESTAMP | Fecha de fin (Viernes 23:59) |
| status | VARCHAR | Estado (open/closed) |
| report_sent | BOOLEAN | Si ya se envió el reporte |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |

### Tabla: settings
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único |
| key | VARCHAR | Clave de configuración |
| value | TEXT | Valor |

## ⏰ Configurar Reportes Semanales

### Opción 1: Vercel Cron Jobs

Crea un archivo `vercel.json` en la raíz del proyecto:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-report",
      "schedule": "59 23 * * 5"
    }
  ]
}
```

### Opción 2: External Scheduler (cron-job.org, EasyCron)

Configura un job que ejecute POST a:
```
https://tu-dominio.com/api/cron/weekly-report
```

Con header:
```
Authorization: Bearer tu_cron_secret
```

### Opción 3: Manual desde Admin

En el panel de administración, pestaña "Reportes", haz clic en:
- "Ver Reporte Actual" para previsualizar
- "Cerrar Semana y Generar Reporte" para cerrar manualmente

## 🚀 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente
4. Configura Cron Jobs en Vercel para reportes semanales

### Docker

```bash
docker build -t indira-store .
docker run -p 3000:3000 --env-file .env indira-store
```

### Variables de entorno necesarias en producción

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `CRON_SECRET`

## 🔧 Desarrollo

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar en producción
npm start

# Linting
npm run lint
```

## 📱 Optimización Mobile

- Diseño responsive con Tailwind CSS
- Touch-friendly UI
- Gestos de swipe en el carrito
- Animaciones suaves
- Persistencia del carrito en localStorage
- PWA-ready con manifest.json

## 🔄 Flujo de Trabajo

### Pedido Normal (En Stock)
1. Usuario agrega productos al carrito
2. Usuario completa checkout
3. Pedido guardado como `in_stock`
4. Stock reducido automáticamente
5. Notificación enviada a Telegram

### Pre-pedido (Agotado)
1. Usuario agrega productos sin stock al carrito
2. Usuario ve mensaje de "Pre-pedido - Entrega en ~1.5 semanas"
3. Usuario completa checkout
4. Pedido guardado como `pre_order`
5. Stock NO reducido
6. Notificación enviada a Telegram con indicador de pre-pedido

### Reporte Semanal
1. Cada Viernes 23:59 (o manual)
2. Sistema cierra ciclo actual
3. Genera estadísticas de la semana
4. Envía reporte a Telegram
5. Crea nuevo ciclo para siguiente semana

## 🤝 Contribuir

1. Fork del repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

---

Hecho con ❤️ para Indira Store