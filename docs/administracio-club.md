# Àrea d'administració del Club Tennis Agramunt

Anàlisi funcional · 1 de novembre de 2026 · Proposta pendent d'implementar.

## Objectiu i límits

Permetre que la junta gestioni socis, quotes, documents i activitat des d'un
únic espai privat, usable amb mòbil i ordinador. Els punts 4, 5 i 8 del pla
estan en standby. Aquest espai no depèn de Stripe, del pany ni de Playtomic.
El projecte actual encara no disposa d'aquest panell ni dels seus fluxos.

## Necessitats i prioritats

| Àmbit | Què ha de poder fer la direcció | Prioritat |
| --- | --- | --- |
| Resum | Veure altes pendents, mandats que falten, quotes vençudes i pròxims esdeveniments | Inicial |
| Socis | Donar d'alta, buscar, editar, activar, donar de baixa i consultar historial | Inicial |
| Famílies | Relacionar membres, titular de pagament i tutors quan hi hagi menors | Inicial |
| Documents | Arxivar formularis d'alta i domiciliació signats amb versions i accés restringit | Inicial |
| Quotes | Assignar categoria, import, temporada, venciment i estat de cada rebut | Inicial |
| Permisos | Separar secretaria, tresoreria i comunicació; retirar accessos en canvis de junta | Inicial |
| Notícies | Crear, revisar i publicar informació del club sense tocar codi | Següent |
| Tornejos | Gestionar fitxa, dates, categories, inscripcions, aforament i resultats | Següent |
| Pistes | Bloquejar per manteniment, pluja o torneig i gestionar reserves afectades | Amb reserves |
| Comunicacions | Avisos a destinataris seleccionats i registre d'enviaments | Següent |
| Instagram | Preparar contingut compartit i publicar-lo mitjançant connexió autoritzada | Per etapes |
| Remeses | Generar fitxer acceptat pel banc i conciliar cobraments i devolucions | Posterior |
| Gestió interna | Actes, acords, proveïdors, incidències i tasques amb responsable | Ampliació |
| Indicadors | Evolució del cens, imports pendents i participació; ocupació quan hi hagi reserves | Ampliació |

## Socis: un expedient complet

- Número de soci estable, nom, contacte, categoria i dates d'alta i baixa.
- Estat: sol·licitud pendent, pendent de documentació, actiu, suspès o baixa.
  L'estat de soci, el compte d'accés i l'estat de cobrament són independents.
- Unitats familiars i pagador, que pot ser diferent del soci; tutors si escau.
- Documents associats, preferències de comunicació i autoritzacions diferenciades
  per tractaments com la publicació d'imatges. Recollir només dades necessàries.
- Historial de canvis amb autor, data i motiu; baixa sense perdre la traçabilitat
  necessària per a rebuts i documents, segons la política de conservació acordada.
- Importació del cens existent amb detecció de possibles duplicats, validació
  i revisió abans de confirmar. Exportacions limitades al rol i a la finalitat.

Flux: secretaria registra una sol·licitud → comprova dades i documents →
assigna categoria i quota → persona autoritzada aprova l'alta → s'habilita
l'accés del soci si correspon. Cap persona s'autoaprova com a soci o administrador.

## Domiciliació i tresoreria

El formulari d'alta i el mandat bancari són documents diferents, encara que
es puguin recollir junts. Guardar el PDF no executa una domiciliació.

- Mandat: titular, IBAN, referència única, identificador del creditor, data
  de signatura, document signat i estat pendent/validat/revocat/substituït.
- Conservar versions i canvis; substituir un mandat no ha d'esborrar l'anterior.
- Començar amb càrrega de documents ja signats. La signatura electrònica és
  una ampliació que requereix triar i validar el circuit, no una casella de consentiment.
- Quotes configurables per categoria i temporada; preveure familiars,
  bonificacions i prorrateig només segons normes aprovades pel club.
- Cada rebut té import i període propis: pendent, preparat, enviat al banc,
  cobrat, retornat o anul·lat. Registrar també pagaments manuals justificats.
- Un fitxer exportat o enviat no marca el rebut com a cobrat. Conciliar amb
  confirmació bancària o registre manual auditat i evitar remeses duplicades.
- Primera entrega: control administratiu i exportació per tresoreria. Després,
  format de remesa acordat amb el banc, comprovació i gestió de devolucions.

L'EPC descriu el mandat signat, la seva conservació pel creditor i la identificació
mitjançant referència i identificador del creditor. El model i el circuit concrets
s'han de validar amb el banc del club abans de generar remeses.
[Font: European Payments Council](https://www.europeanpaymentscouncil.eu/what-we-do/sepa-direct-debit).

## Notícies, tornejos i Instagram

Una mateixa notícia o torneig ha de servir com a origen del contingut per a web
i Instagram, amb adaptacions per canal. Proposta de flux:

1. Crear esborrany amb títol, text, fotografia/cartell, idioma i dates.
2. Si és torneig, afegir modalitat, categories, normativa, places, termini,
   import si n'hi ha i formulari d'inscripció; gestionar confirmats i llista d'espera.
3. Previsualitzar la pàgina web i el text/imatge d'Instagram per separat.
4. Seleccionar canals i publicar o programar; conservar autor i aprovació.
5. Consultar l'estat de cada canal i l'enllaç publicat. Un error d'Instagram
   no desfà la publicació web ni es presenta com a èxit.

Primera etapa: publicar al web i generar text i imatge descarregables per a
Instagram, amb estat manual explícit. Segona etapa: publicació per l'API de Meta
amb compte professional, permisos validats i credencials protegides al servidor.
La documentació de Meta consultada descriu publicació per a comptes professionals;
la via Facebook Login requereix també una pàgina vinculada. Cal validar la via
d'autenticació aplicable al compte del club abans de concretar la integració.
[Font: documentació d'Instagram de Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api).

La integració ha de tenir cua persistent, prevenció de duplicats, reintents i
alerta quan calgui reconnectar el compte. Després d'un resultat incert, comprovar
si la publicació existeix abans de repetir. Editar o retirar al web no ha de
prometre editar o retirar automàticament a Instagram: mostrar l'acció pendent
segons les capacitats verificades de l'API. Començar per publicacions al feed;
stories, reels i missatgeria queden fora de la primera entrega.

Les inscripcions i els contactes són privats. La publicació de noms, resultats
o fotografies necessita un circuit de revisió, especialment si hi ha menors.
Durant el standby de Stripe, els pagaments de tornejos es registren manualment.

## Permisos i protecció incorporats al disseny

| Perfil proposat | Accés habitual |
| --- | --- |
| Direcció | Resum i gestió del club; permisos sensibles concedits explícitament |
| Secretaria | Cens, sol·licituds i documents d'alta; dades bancàries ocultes per defecte |
| Tresoreria | Quotes, pagadors, mandats, dades bancàries i conciliació |
| Comunicació | Notícies, cartells i publicacions; sense accés a IBAN ni mandats |
| Responsable esportiu | Tornejos, participants necessaris i pistes; sense dades bancàries |

Una persona pot acumular funcions. La gestió de permisos queda reservada a
persones designades; verificar autorització al servidor en cada operació.
Proposar doble factor per als accessos de junta i operacions sensibles.

Documents en emmagatzematge privat, amb accés temporal autoritzat, validació de
tipus i mida i control de fitxers abans de servir-los. IBAN emmascarat en llistats,
sense dades bancàries a logs, correus, analítica o memòria cau pública/offline.
Registrar consultes sensibles, descàrregues, exportacions i canvis sense copiar
el contingut privat als registres. Incloure còpies de dades i documents i una
prova de restauració. Definir conservació per tipus documental i procediment
de rectificació/supressió amb els responsables del club abans de producció.

## Entregues i acceptació

**9A — Secretaria i tresoreria:** una persona autoritzada dona d'alta un soci,
adjunta el mandat privat, el valida, assigna una quota i registra un cobrament
o devolució. Un editor i un soci no poden obtenir dades ni documents bancaris,
tampoc coneixent-ne l'enllaç. Canvis i accessos sensibles queden auditats.

**9B — Continguts i activitat:** comunicació publica una notícia i crea un torneig
amb inscripcions i llista d'espera; les dades dels inscrits no es filtren al web.
Es pot preparar la versió d'Instagram sense afirmar que s'hi ha publicat.

**9C — Integracions:** validar el compte Meta amb una publicació acordada pel
club; comprovar fallades, reconnectar i reintentar sense duplicar. Remeses:
validar amb el banc i impedir enviar dues vegades el mateix rebut.

## Informació a recollir per a la implementació

- Qui fa secretaria, tresoreria, comunicació i aprovació d'altes avui.
- On és el cens actual, volum aproximat, categories, familiars i menors.
- Quotes vigents, periodicitat, bonificacions i criteri davant d'impagaments.
- Formulari d'alta i mandat actuals, banc i procediment de domiciliació existent.
- Compte Instagram, tipus de compte i qui en té l'administració.
- Circuit de tornejos: qui s'hi pot inscriure, aforament, imports i responsables.

Aquests punts concreten regles i integracions; no impedeixen començar pel
disseny del cens, els permisos i el circuit documental.
