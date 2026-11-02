# Alta de soci, pagament i documentació

La portada utilitza les dues fotografies indicades pel propietari, sense
publicar-hi les quotes ni el compte bancari. «Fes-te soci» obre el registre
a `/ca/acces?mode=signup` (també ES/EN).

Un compte sense validar entra sempre a «El meu compte» i veu primer les
quotes i les instruccions, abans del perfil. No pot accedir a la reserva.
`membership_settings` conté imports en cèntims, temporada, banc, IBAN, WhatsApp,
enllaç al formulari i nota. Els valors inicials s'han confirmat amb el propietari
el 2 de novembre de 2026. La consulta és autenticada, dinàmica i sense memòria cau.
Realtime actualitza els canvis, amb recuperació en tornar a la pestanya i
comprovació periòdica de 15 segons quan la connexió en temps real no està disponible.

## Circuit

1. Triar adult/infantil i transferència/domiciliació SEPA.
2. Descarregar, emplenar i signar el formulari original del club.
3. Pujar el formulari i el justificant de transferència; per domiciliació,
   el justificant és opcional. Contacte WhatsApp disponible per als dubtes.
4. Enviar la sol·licitud: l'import i la temporada es capturen al servidor.
5. La junta revisa la documentació i el cobrament al banc. Pot demanar una
   correcció amb un missatge; el sol·licitant pot tornar a enviar els documents.
6. En aprovar, una transacció registra la revisió i activa el perfil com a soci.
   L'usuari veu les reserves habilitades en actualitzar-se l'estat.

Pujar un comprovant no activa cap permís ni prova per si sol que s'hagi cobrat.
Aquest flux no executa transferències, càrrecs SEPA ni pagaments amb targeta.
L'activació manual de socis coneguts i la delegació d'administradors mantenen
els controls previs; les altes presentades es revisen al nou panell.

## Administració

`/ca/administracio/adhesions`: editor de quotes i instruccions, sol·licituds,
descàrregues privades, correccions i aprovació. S'hi accedeix des d'«Altes i
quotes» al panell principal. També es mostra dins de «Socis» a l'àrea de socis.
Els canvis de configuració no necessiten cap desplegament.

## Fitxers i permisos

Bucket privat `membership-documents`, màxim 3 MB per fitxer. Només PDF, JPG
i PNG amb signatura binària coherent al servidor. Rutes aleatòries dins de
la carpeta UUID del titular, sense noms personals al nom del fitxer.
RLS limita lectura al titular i administradors actius, inserció a la carpeta
pròpia i impedeix substitucions. No es poden eliminar fitxers referenciats
per una sol·licitud. Les descàrregues utilitzen URL signades de 60 segons.
No s'utilitzen claus service_role al navegador ni URLs públiques de documents.

## Verificació i neteja

`membership-onboarding.spec.ts` cobreix dos actors, configuració en viu sense
alterar les quotes reals, arxius privats, correcció, reenviament, aprovació,
imports autoritatius i bloqueig de reserves abans de validar.

Abans de repetir les proves: executar amb el MCP l'SQL de
`node scripts/cleanup-membership-fixtures.mjs --reset-sql` i després executar
`node scripts/cleanup-membership-fixtures.mjs` per eliminar els objectes de
prova mitjançant l'API Storage. No eliminar mai les files `storage.objects`
directament amb SQL. En acabar definitivament, usar `--sql` en lloc de
`--reset-sql`, netejar Storage i després eliminar els usuaris amb el procediment
de `prepare-member-fixtures.mjs --cleanup-sql`.

L'SMTP propi continua pendent de configuració per habilitar l'entrega de
confirmacions i recuperacions a tots els destinataris. Les proves utilitzen
comptes temporals confirmats, sense enviar correus a persones reals.
