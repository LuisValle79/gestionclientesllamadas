# Sistema de Gestión de Clientes

Aplicación web para la gestión de clientes, mensajes y recordatorios, desarrollada con React, TypeScript, Material UI y Supabase.

## Características

- Gestión de clientes (crear, editar, eliminar)
- Sistema de mensajes para comunicación con clientes
- Recordatorios para llamadas, visitas y reuniones
- Sistema de roles (administrador, asesor, cliente)
- Autenticación y autorización con Supabase

## Requisitos previos

- Node.js (versión 20.19+ o 22.12+ recomendada)
- npm o yarn
- Cuenta en Supabase

## Configuración

1. Clona el repositorio

```bash
git clone <url-del-repositorio>
cd gestionclientesllamadas
```

2. Instala las dependencias

```bash
npm install
# o
yarn install
```

3. Configura las variables de entorno

Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-key
```

4. Configura la base de datos en Supabase

Ejecuta el script SQL proporcionado en `script.sql` en la consola SQL de Supabase para crear las tablas, funciones y políticas necesarias.

## Ejecución

```bash
npm run dev
# o
yarn dev
```

La aplicación estará disponible en `http://localhost:5173`
## Estructura del proyecto

- `/src`: Código fuente
  - `/assets`: Recursos estáticos
  - `/components`: Componentes reutilizables
  - `/context`: Contextos de React (AuthContext)
  - `/pages`: Páginas principales
  - `/services`: Servicios (configuración de Supabase)

## Base de datos

El sistema utiliza las siguientes tablas:

- `clientes`: Información de clientes
- `mensajes`: Mensajes enviados a clientes
- `recordatorios`: Recordatorios de llamadas, visitas y reuniones
- `perfiles_usuario`: Perfiles de usuarios con roles

## Seguridad

El sistema implementa Row Level Security (RLS) en Supabase para garantizar que los usuarios solo puedan acceder a los datos según su rol:

- Administradores: Acceso completo
- Asesores: Acceso a todos los clientes pero con permisos limitados
- Clientes: Solo acceso a sus propios datos
