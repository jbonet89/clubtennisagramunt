# Club Tennis Agramunt

Web de Next.js 15 (App Router, TypeScript) amb portada pública CA/ES/EN,
Tailwind, components shadcn/ui i il·lustracions de pistes animades amb Motion.
Clients Supabase SSR i middleware per validar i renovar les sessions.
Àrea de socis amb aprovació administrativa, reserves reals i text WhatsApp.

Pla d'entregues i dependències: [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).
Fonts del contingut i de les imatges: [docs/content-sources.md](./docs/content-sources.md).

## Desarrollo

1. Instala Node.js 22.
2. Ejecuta `npm ci`.
3. Configura `.env.local` siguiendo [SETUP.md](./SETUP.md).
4. Ejecuta `npm run dev`.

Comprobaciones: `npm run typecheck` y `npm run build`.
Proves E2E: `npx playwright install chromium` i `npm run test:e2e`, després
de compilar. Es proven Chromium d'escriptori i mòbil contra el servidor
de producció local. `PLAYWRIGHT_BASE_URL` permet verificar un desplegament.
Les proves de socis necessiten comptes temporals a Supabase i neteja posterior:
vegeu [accés i reserves](docs/member-access.md).
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
El middleware refresca sesiones; las rutas privadas verifican las claims,
el perfil actual y las políticas RLS. Las migraciones están en `supabase/migrations/`.

## Vercel

Proyecto creado en el equipo `ClubTennisAgramunt` e importado desde
`jbonet89/clubtennisagramunt`, rama `main`, con Next.js y directorio raiz `.`.
Panel: https://vercel.com/club-tennis-agramunt/clubtennisagramunt

Las variables `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` se guardaron para Production y Preview.
Se usa el proyecto Supabase existente `qubhsueehwdngafjjmrm`.
La integracion nativa de Marketplace es opcional: el cliente de la aplicacion
se conecta mediante esas variables. No es necesario crear otra base de datos.

Primer despliegue verificado: https://clubtennisagramunt.vercel.app devuelve
HTTP 200 con la pagina CTA en catalan y GitHub informa Vercel success.
La conexion GitHub dispara despliegues al actualizar `main`.
Los retornos de autenticación usan esa URL canónica como fallback de
`NEXT_PUBLIC_SITE_URL`; configurar la variable al cambiar de dominio. Para desarrollo
local, usa `http://localhost:3000` y conserva `.env.local` fuera de Git.

## Alcance actual

Primera entrega pública: identitat del club, pistes, història, arxiu,
contacte, consultes per correu, navegació mòbil i idiomes CA/ES/EN.
`/` redirigeix a `/ca`; `/es` i `/en` tenen contingut i metadades propis.
El middleware combina l'idioma amb la renovació de cookies de Supabase.

Àrea privada a `/ca/socis` (també ES/EN): inici de sessió, compte pendent,
aprovació i desactivació manual per administradors, disponibilitat de les dues
pistes de 07:00 a 23:00, reserves gratuïtes de 60/90 minuts, cancel·lació,
historial i text per WhatsApp. Supabase bloqueja reserves sense aprovació,
solapaments i accés a reserves d'altres usuaris.
Els administradors poden concedir el mateix rol a altres comptes amb correu
confirmat des del panell **Socis i administradors**.

SMTP pendent de configurar: les altes i recuperacions per correu per al públic
general encara requereixen aquesta configuració i una prova d'entrega real.
[Procediment del primer administrador i detalls](docs/member-access.md).
Pagaments, estadístiques, integracions físiques i PWA continuen per fases.
