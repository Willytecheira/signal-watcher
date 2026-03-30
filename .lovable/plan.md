

# Sistema de Login Simple con SQLite

## Resumen
Login con usuarios almacenados en SQLite en el mismo backend. Un usuario admin (creado por defecto) puede crear nuevas cuentas. Las contraseñas se hashean con bcrypt. El frontend muestra una página de login y protege el dashboard.

## Cambios en el Backend (`backend/`)

### 1. Nueva tabla `users` en `db.js`
- Tabla con `id`, `username`, `password_hash`, `role` (admin/user), `created_at`
- Seed automático: usuario admin por defecto (`admin` / contraseña configurable via env `ADMIN_PASSWORD`, default `admin123`)
- Funciones: `createUser`, `findUserByUsername`, `getUsers`, `deleteUser`

### 2. Dependencias nuevas
- `bcryptjs` — hasheo de contraseñas (puro JS, sin compilación nativa)
- `jsonwebtoken` — tokens JWT para sesiones

### 3. Nuevos endpoints en `server.js`
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | No | Login → devuelve JWT |
| `/api/auth/me` | GET | JWT | Info del usuario actual |
| `/api/admin/users` | GET | Admin | Listar usuarios |
| `/api/admin/users` | POST | Admin | Crear usuario |
| `/api/admin/users/:id` | DELETE | Admin | Eliminar usuario |

### 4. Middleware de autenticación
- Verificar header `Authorization: Bearer <token>` en rutas protegidas
- `/api/signals` pasará a requerir autenticación

## Cambios en el Frontend (`src/`)

### 5. Página de Login
- Ruta `/login` con formulario usuario/contraseña
- Guarda JWT en localStorage
- Redirige al dashboard tras login exitoso

### 6. Protección de rutas
- Componente `ProtectedRoute` que verifica JWT
- Redirige a `/login` si no hay sesión

### 7. Panel de Admin (dentro del dashboard)
- Botón/sección para gestionar usuarios (solo visible para admin)
- Formulario para crear usuario (username + password)
- Lista de usuarios con opción de eliminar

### 8. Header con logout
- Mostrar usuario actual y botón de cerrar sesión

## Despliegue
Después de implementar, rebuild del Docker en el VPS:
```
cd ~/signal-watcher && git pull
docker compose -f backend/docker-compose.yml up -d --build
```

