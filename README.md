# Club Tennis Agramunt

Web de Next.js 15 (App Router, TypeScript) amb portada pública CA/ES/EN,
Tailwind, components shadcn/ui i il·lustracions de pistes animades amb Motion.
Clients Supabase SSR i middleware per validar i renovar les sessions.

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
`NEXT_PUBLIC_SITE_URL` aun debe configurarse en Vercel con esa URL antes
de implementar enlaces de retorno de autenticacion y pagos. Para desarrollo
local, usa `http://localhost:3000` y conserva `.env.local` fuera de Git.

## Alcance actual

Primera entrega pública: identitat del club, pistes, història, arxiu,
contacte, consultes per correu, navegació mòbil i idiomes CA/ES/EN.
`/` redirigeix a `/ca`; `/es` i `/en` tenen contingut i metadades propis.
El middleware combina l'idioma amb la renovació de cookies de Supabase.

Les reserves digitals, autenticació de socis, pagaments, migracions,
estadístiques, integracions físiques i PWA es desenvoluparan per fases.
La portada informa que la reserva en línia encara no està disponible.
