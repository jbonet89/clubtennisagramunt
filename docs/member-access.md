# Accés, aprovació de socis i reserves

## Funcionament

Les rutes `/ca/acces` i `/ca/socis` també existeixen en ES i EN.
Crear un compte i confirmar-ne el correu no activa la condició de soci:
el perfil nou queda `guest`, amb `member_active=false`. No veu el formulari
de reserva i la base de dades rebutja els intents de reservar directament.
Les metadades enviades pel navegador no poden concedir permisos.

Un administrador entra a l'àrea de socis i, a **Validació de socis**, comprova
el cens i que la quota estigui al dia abans de prémer **Activa com a soci**.
També pot desactivar les reserves. El servidor consulta l'estat actual del
perfil en cada operació, encara que l'usuari conservi una sessió oberta.
L'activació és manual: no cobra ni certifica un pagament. El registre de
quotes, mandats i domiciliacions correspon a la fase 9A.

## Primer administrador

El titular del correu del club `clubtennisagramunt1974@gmail.com` ha de crear
el seu compte i confirmar-ne el correu. El trigger comprova el correu real
confirmat a Supabase Auth i li assigna el rol inicial d'administrador.
No es proporciona cap contrasenya predeterminada. La resta d'usuaris
requereixen aprovació manual; cap formulari públic permet crear administradors.

## Correu pendent

El club ha confirmat que encara no disposa d'SMTP configurat. A Supabase,
Authentication → Emails → SMTP Settings, cal connectar el proveïdor del club
i verificar el remitent. El servei de correu de proves limita els destinataris;
les altes i recuperacions per al públic general encara no es poden donar
per operatives. No s'ha desactivat la confirmació de correu.

Configuració desada a Supabase:

- Site URL: `https://clubtennisagramunt.vercel.app`.
- Callbacks autoritzats: `/auth/callback` al domini de producció,
  `http://localhost:3000` i `http://127.0.0.1:3000`.
- Confirmació i recuperació amb PKCE: obrir el correu al mateix navegador.
- En producció s'utilitza la URL canònica com a fallback de `NEXT_PUBLIC_SITE_URL`.
  Configurar aquesta variable explícitament quan canviï el domini.

## Reserves

Dues pistes, horari 07:00–23:00 Europe/Madrid, inicis cada 30 minuts,
durada 60 o 90 minuts i anticipació màxima de 14 dies. Només socis actius
o administradors actius poden reservar. Les reserves es desen a Supabase,
amb `payment_status=free_member`, `source=web` i sense PIN electrònic.
La restricció GiST rebutja solapaments fins i tot amb peticions simultànies.
Cancel·lar abans de començar conserva el registre com a `cancelled`.

El text de WhatsApp es genera després de confirmar el registre i inclou la
data, l'horari, la pista, els jugadors i «Claus de soci». El botó obre `wa.me`;
l'usuari tria on compartir-lo. La disponibilitat no revela noms ni perfils
d'altres socis. Les respostes privades no s'emmagatzemen a la memòria cau.

## Migracions i comprovacions

Les migracions de `supabase/migrations/` estan aplicades al projecte
`qubhsueehwdngafjjmrm`. `supabase/schema.sql` documenta l'esquema base;
les migracions són la font per reproduir-lo i inclouen l'enduriment posterior.

Per a les proves públiques i de temps:

```powershell
npm run build
npx playwright test tests/e2e/landing-and-i18n.spec.ts tests/e2e/booking-time.spec.ts
```

Les proves de socis escriuen dades reals. Preparar només en un projecte
autoritzat: `node scripts/prepare-member-fixtures.mjs` genera SQL per executar
amb el MCP administratiu i desa les credencials aleatòries a `.env.e2e.local`
(ignorat per Git). No imprimir aquest fitxer ni pujar-lo a CI. Executar després
`npx playwright test tests/e2e/member-booking.spec.ts` o tota la suite.
Les proves d'aprovació també desactiven els comptes per permetre repetir-les.
Les traces d'autenticació estan desactivades per evitar capturar contrasenyes.

En acabar, executar amb el MCP l'SQL de
`node scripts/prepare-member-fixtures.mjs --cleanup-sql`: només elimina els
UUID de la tanda amb el marcador `cta_e2e_run` i correu `@example.test`.
Les dades de prova associades s'eliminen en cascada. Eliminar llavors el
fitxer local de credencials. No deixar comptes administradors de prova.
