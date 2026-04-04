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

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Notificaciones**: Telegram Bot API
- **Estado**: React Context + LocalStorage

## 📦 Instalación

### 1. Clonar e instalar dependencias

```bash
cd indira-store
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.local` y configura tus credenciales:

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

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── admin/          # Auth y configuración
│   │   ├── orders/         # API de pedidos
│   │   └── products/       # API de productos
│   ├── admin/              # Panel de administración
│   └── page.tsx            # Catálogo principal
├── components/
│   ├── cart/               # Componentes del carrito
│   ├── checkout/           # Modal de checkout
│   └── product/            # Tarjetas de producto
├── context/
│   └── CartContext.tsx     # Estado global del carrito
├── lib/
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
| created_at | TIMESTAMP | Fecha de creación |

### Tabla: orders
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único |
| customer_name | VARCHAR | Nombre del cliente |
| phone | VARCHAR | Teléfono |
| items | JSONB | Productos del pedido |
| total | DECIMAL | Total del pedido |
| status | VARCHAR | Estado (pending/completed/cancelled) |
| created_at | TIMESTAMP | Fecha del pedido |

### Tabla: settings
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único |
| key | VARCHAR | Clave de configuración |
| value | TEXT | Valor |

## 🚀 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

### Railway

```bash
railway init
railway run npm run build
railway up
```

### Variables de entorno necesarias en producción

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

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