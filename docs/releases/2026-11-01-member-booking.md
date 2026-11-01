# Accés aprovat i reserves dels socis

Implementació: `33ac4a8`, correcció `f725d71` · 1 de novembre de 2026.

- Àrea privada CA/ES/EN amb Supabase Auth, sessions SSR i formularis d'alta,
  confirmació i recuperació PKCE.
- Perfil nou pendent (`guest`, inactiu). Un administrador ha de comprovar
  cens i quota abans d'activar-lo; confirmar un correu no concedeix reserves.
- Panell d'activació/desactivació. Rols i estat protegits al servidor i a
  PostgreSQL, també davant intents de modificar metadades o escriure directament.
- Reserves reals de les dues pistes, 07:00–23:00 Europe/Madrid, inicis cada
  mitja hora, durades 60/90 minuts i 14 dies vista. Cancel·lació i historial.
- Exclusió GiST contra solapaments, transacció de reserva i notificació,
  disponibilitat sense dades personals d'altres socis.
- Text WhatsApp amb data, hora, pista, jugadors i claus de soci. Botó `wa.me`
  i còpia del text després de la confirmació de Supabase.

## Validació local

`npm run build` i comprovació TypeScript correctes.
`npx playwright test --workers=1 --timeout=90000`: **30 proves correctes**,
en Chromium d'escriptori i mòbil. Inclou reserva real, persistència després
de recarregar, text WhatsApp, cancel·lació, sortida, compte pendent,
metadades malicioses, activació, revocació, privadesa i concurrència.
També cobreix idiomes, teclat, contingut públic i canvis d'hora de Madrid.
Després de detectar una interacció prematura al desplegament, el formulari
de reserva es manté desactivat fins que React està preparat. Les 8 proves de
socis s'han repetit correctament amb la correcció i una comprovació explícita
de la pista desada, a més del text WhatsApp.

Les migracions estan aplicades al Supabase del club. Totes les taules públiques
tenen RLS i no hi ha reserves confirmades solapades. L'auditor de seguretat
de Supabase només assenyala la protecció de contrasenyes filtrades desactivada.

## Límit pendent

SMTP propi encara no configurat, confirmat pel club. Falta verificar l'entrega
real de correus d'alta i recuperació per al públic general. No s'ha desactivat
la confirmació per correu per esquivar aquesta dependència.

No es registra cap cobrament en aprovar un soci: la junta verifica la quota
manualment. Les quotes administratives, pagaments de convidats, pany i
Playtomic mantenen l'abast definit al pla.

Procediment del primer administrador, correu i proves:
[accés i reserves](../member-access.md).

## Producció

Desplegament automàtic de `f725d71` amb estat Vercel **success**.
`PLAYWRIGHT_BASE_URL=https://clubtennisagramunt.vercel.app`:
**8 proves de socis correctes** en escriptori i mòbil. Comprovat el recorregut
navegador → API de Vercel → Supabase → confirmació i text WhatsApp,
inclosa la pista triada, així com els permisos i la cancel·lació real.

S'han eliminat els 6 comptes temporals, les reserves i notificacions associades,
i el fitxer local de credencials. No queden administradors de prova.

Accés publicat: https://clubtennisagramunt.vercel.app/ca/acces.
