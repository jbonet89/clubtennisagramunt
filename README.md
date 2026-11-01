# Club Tennis Agramunt

Base de Next.js 15 (App Router, TypeScript) con clientes Supabase SSR y
middleware para validar y refrescar sesiones mediante `auth.getClaims()`.

## Desarrollo

1. Instala Node.js 22.
2. Ejecuta `npm ci`.
3. Configura `.env.local` siguiendo [SETUP.md](./SETUP.md).
4. Ejecuta `npm run dev`.

Comprobaciones: `npm run typecheck` y `npm run build`.
Las versiones estan fijadas en package.json y package-lock.json. Se fija
PostCSS 8.5.32 mediante overrides para corregir los avisos de seguridad de
la version transitiva incluida por Next.js 15.

## Supabase

- Navegador: `createClient()` de `utils/supabase/client.ts`.
- Servidor: `await createClient()` de `utils/supabase/server.ts`.
- Renovacion de cookies: `middleware.ts` y `utils/supabase/middleware.ts`.

Las variables requeridas son `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No se necesitan claves secretas
para estos clientes. No se consulta ni se crea la tabla de ejemplo `todos`.
El middleware refresca sesiones; cada futura ruta privada debe verificar
las claims y autorizar el acceso, junto con las politicas RLS.

## Vercel

Importa `jbonet89/clubtennisagramunt`, selecciona Next.js, directorio raiz `.`
y Node.js 22.x. Usa `npm run build` y la instalacion basada en package-lock.json.
Configura las dos variables publicas de Supabase antes de compilar. En cada
entorno, establece `NEXT_PUBLIC_SITE_URL` en su URL correspondiente.

No hay un proyecto Vercel vinculado hasta confirmar su creacion/importacion
en el servicio. No se guardan identificadores de despliegue inventados.

## Alcance actual

Pagina inicial provisional y base de integracion. Reservas, autenticacion UI,
pagos, migraciones, i18n y PWA quedan para las siguientes fases de la mision.
