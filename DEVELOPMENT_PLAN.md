# Pla de desenvolupament CTA

Actualitzat: 1 de novembre de 2026. Cada fase acaba amb una entrega provada
i desplegada; aquest document registra el que està fet i el que encara falta.

Decisió de direcció (1 de novembre de 2026): els punts **4, 5 i 8 queden
en standby**, fora de les entregues actives, fins que el club tingui resolts
el tancament automàtic i la disponibilitat de Playtomic i decideixi reprendre'ls.
L'àrea d'administració i la gestió de quotes domiciliades poden avançar sense
aquestes integracions. Anàlisi: [Àrea d'administració](docs/administracio-club.md).

Ordre actiu: web pública (1), identitat i permisos (2), reserves de socis (3),
administració essencial (9A), continguts i tornejos (9B), àrea de socis
(6) i PWA (7). La integració amb Instagram (9C) té dependències pròpies.

## Forma de treball

1. Implementar una entrega petita i utilitzable.
2. Comprovar tipus, compilacio i els recorreguts E2E afectats.
3. Revisar mobil, escriptori, teclat i moviment reduit quan hi ha canvis visuals.
4. Fer commit i push a `main` nomes despres de les comprovacions locals.
5. Verificar el resultat de Vercel i la pagina publicada abans de marcar fet.
6. Registrar limitacions i continuar per la seguent entrega. Els pagaments,
   correus, panys i sincronitzacions no es presentaran com a reals en mode mock.

## 0. Infraestructura — completada

- [x] Next.js 15, TypeScript i clients Supabase SSR.
- [x] Repositori `jbonet89/clubtennisagramunt` i desplegament automatic a Vercel.
- [x] Configuracio publica de Supabase a Vercel.
- [x] Primera pagina publicada: https://clubtennisagramunt.vercel.app.
- [x] Accés administratiu MCP al Supabase `qubhsueehwdngafjjmrm` verificat.

## 1. Web pública i idiomes — primera entrega publicada

- [x] Tailwind i primitives shadcn/ui; identitat basada en el logotip original blau.
- [x] Portada adaptable amb CA per defecte, ES i EN mitjancant next-intl.
- [x] Selector de pistes Quick / terra batuda amb dibuix SVG i moviment accessible.
- [x] Historia, arxiu de 2018, contacte i crida per fer-se soci.
- [x] Metadades, canonical, alternates, sitemap i robots.
- [x] Playwright: 18 proves en escriptori i mobil; idiomes, teclat, pistes,
      metadades, enllacos, arxiu, absencia de desbordament i moviment reduit.
- [x] Compilacio de produccio, TypeScript i captures locals verificats.
- [x] Publicació Vercel verificada: CA/ES/EN amb HTTP 200 i 2 proves E2E
      sobre producció (canvi d'idiomes i selector de pistes).
- [ ] Iteracio visual posterior: Lenis, revelat progressiu del tracat SVG i
      cronologia amb animacio vinculada al desplacament (referencia ScrollCraft).

Acceptacio: una persona pot coneixer el club, comparar les dues pistes,
canviar d'idioma i contactar-hi. La portada enllaça les reserves dels socis actius.

Registre de l'entrega: [web pública multilingüe](docs/releases/2026-11-01-public-web.md).

## 2. Dades i accés dels socis

- [x] Migracions i llavors: profiles, courts, bookings, matches, notifications.
- [x] Membres actius i configuració horària a la base de dades.
- [ ] Ampliacions futures: contingut historic i cua de sync.
- [x] RLS, indexs i exclusio de reserves solapades al PostgreSQL.
- [x] Inici i tancament de sessio; formularis d'alta i recuperació amb PKCE.
- [ ] SMTP propi i prova real d'alta, confirmació i recuperació per correu.
- [x] Altes de socis i rols aprovats pel club; un usuari no pot autoconcedir-se
      el rol de soci/admin ni activar la seva condicio de soci.
- [x] Compte inicial Admin aprovisionat i inici de sessió comprovat; delegació
      d'administradors només des d'un administrador actiu, amb correu confirmat.
- [x] Proves amb usuaris soci/convidat/admin i auditories Supabase.

Dependencia: accés administratiu al Supabase `qubhsueehwdngafjjmrm`.
Acceptacio: identitat i permisos comprovats al servidor i a la base de dades.

## 3. Reserves de socis i WhatsApp

- [x] Disponibilitat de les dues pistes en Europe/Madrid; franges de 60/90 minuts,
      inici cada mitja hora, horari 07:00–23:00 aprovat pel club.
- [x] Reserva gratuita per a soci actiu i gestio de reserves propies.
- [x] Transaccions i restriccio de solapaments; cancel·lació i historial.
- [x] Missatge WhatsApp amb data, pista, jugadors i claus de soci.
- [x] `member-booking.spec.ts`: reserva, accessos, WhatsApp i dues peticions simultanies.
- [x] Verificació del desplegament a producció: 8 proves de socis en mòbil i
      escriptori, incloses aprovació, revocació, reserva real i WhatsApp.

Acceptacio: reserva real, persistida, sense pagament i amb comparticio wa.me.

Entrega: [accés aprovat i reserves](docs/releases/2026-11-01-member-booking.md).
SMTP pendent per habilitar l'alta i recuperació per correu al públic general.

## 4. Convidats i Stripe — en standby

- [ ] Formulari public, preu configurable al servidor i retencio temporal del torn.
- [ ] Checkout de prova i webhooks signats, idempotents i amb validacio d'import.
- [ ] Alliberament de torns per pagament caducat/cancel lat.
- [ ] Confirmacio segura, sense confiar en els parametres del navegador.
- [ ] `guest-booking-payment.spec.ts`: checkout, webhook duplicat i conflicte soci/convidat.

Dependencia: claus Stripe sandbox i preu aprovat. Produccio nomes amb
compte del club preparat i claus de produccio configurades.

## 5. Acces temporal i correus — en standby

- [ ] Adaptador `lib/access/smartLock.ts` amb implementacio mock explicita.
- [ ] PIN criptografic de 6 digits, unic entre accessos vigents, i interval
      de validesa de -10/+10 minuts respecte de la reserva.
- [ ] Emissio despres de pagament confirmat, revocacio i reintents idempotents.
- [ ] Confirmacio protegida i correu amb el PIN; fora de logs i llistats publics.
- [ ] Adaptador real segons pany triat i prova fisica abans d'activar-lo.

Dependencies: proveidor de correu i model/protocol del pany. El mock no dona
accés fisic. Una fallada del pany ha de mostrar un estat d'accés pendent.
La pausa inclou el flux de correu associat al PIN; els correus d'autenticació
i els avisos administratius es planifiquen independentment.

## 6. Àrea de socis, partits i estadistiques

- [ ] Navegacio mobil inferior i reserves passades/actuals/futures.
- [ ] Directori de socis actius amb dades minimes i visibilitat controlada.
- [ ] Avisos del club, pluja/manteniment i invitacions a partits.
- [ ] Resultats individuals/dobles, validacio de sets i permisos d'edicio.
- [ ] Grafics de victories/derrotes, sets i jocs, amb estats sense dades.
- [ ] Connexió amb el panell de direcció de la fase 9 per manteniment i avisos.

## 7. PWA

- [ ] Manifest, icones i instal·lació mobil.
- [ ] Service worker, actualitzacions i pagina offline.
- [ ] Cache nomes de contingut public i assets; no cache de PINs, sessions,
      dades personals, APIs privades ni respostes de pagament.
- [ ] `pwa-manifest.spec.ts`: manifest, instal·lació, zoom i navegacio sense connexio.

Acceptacio: l'app s'instal·la i informa de l'estat offline. Reservar continua
requerint connexio i confirmacio del servidor.

## 8. Playtomic — en standby

L'estabilització i les comprovacions de qualitat continuen en cada entrega activa.

- [ ] `lib/integrations/playtomic.ts`, contracte d'adaptador i sandbox.
- [ ] Outbox persistent de sortida, reintents i conciliacio.
- [ ] Webhook d'entrada autenticat, idempotencia i correspondencia de pistes.
- [ ] Reserves/cancel·lacións entrants amb source=playtomic_sync.
- [ ] Proves de conflictes entre web i Playtomic, duplicats i entrega fora d'ordre.
- [ ] Contracte real validat amb Playtomic abans d'activar produccio.

## 9. Àrea d'administració del club — nova prioritat

Abast detallat i criteris d'acceptació: [anàlisi funcional](docs/administracio-club.md).
Les caselles següents són planificació, no funcionalitats implementades.

### 9A. Secretaria i tresoreria — primera entrega administrativa

- [ ] Accés privat amb permisos de direcció, secretaria, tresoreria i comunicació.
- [ ] Altes, revisió, activació, baixes i historial de socis; unitats familiars.
- [ ] Expedient privat amb formulari d'alta, mandat de domiciliació i versions.
- [ ] Quotes per temporada, venciments i registre de cobraments/devolucions.
- [ ] Cercador, filtres, exportació autoritzada i importació amb previsualització.
- [ ] Panell de pendents, registre d'accions i còpies amb restauració comprovada.
- [ ] Proves d'accés per rol i de protecció dels documents i dades bancàries.

### 9B. Comunicació i activitat

- [ ] Editor de notícies CA/ES/EN amb esborrany, previsualització i publicació.
- [ ] Tornejos amb inscripcions, aforament, llista d'espera i estat de pagament manual.
- [ ] Avisos, calendari i bloquejos de pistes coordinats amb reserves.
- [ ] Preparació del text i la imatge per compartir a Instagram manualment.

### 9C. Publicació a Instagram i remeses bancàries

- [ ] Connexió del compte professional del club i validació de permisos de Meta.
- [ ] Publicació seleccionable web/Instagram amb cua, estats i prevenció de duplicats.
- [ ] Programació, reintents controlats i enllaç a la publicació resultant.
- [ ] Remeses SEPA només després de validar el format amb el banc i la tresoreria.

Dependències: responsables i permisos, cens inicial, categories i quotes vigents,
model de mandat i circuit bancari; compte Instagram del club per a 9C.
Guardar un mandat o generar una remesa no equival a haver cobrat una quota.

## Decisions pendents abans de les fases corresponents

- Tarifa de convidats i política definitiva de termini/cancel·lació. Aquesta
  entrega usa 14 dies vista i cancel·lació abans de l'inici de la reserva.
- Validació manual per un administrador després de comprovar cens i quota;
  pendent el registre administratiu de quotes de la fase 9A.
- Proveidor de correu i credencials, pany fisic i onboarding Playtomic.
- Confirmacio de quotes, telefon, horaris i fotografies actuals del club.

No bloquegen la fase publica. Les tarifes i projectes de 2018 es tracten
com a arxiu, no com a condicions vigents.
