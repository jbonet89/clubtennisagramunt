# Fotografies reals i alta privada de socis

Publicat el 2 de novembre de 2026. Implementació `21c5026`, Vercel **success**.

La portada mostra les fotografies de terra i Quick facilitades pel propietari.
Es conserven els fitxers originals amb enquadrament i color a la presentació;
els botons «Fes-te soci» obren el registre.

Les quotes i les dades de pagament no apareixen a la landing. Els comptes
pendents veuen primer la informació d'alta dins de l'àrea privada, poden
consultar dubtes per WhatsApp i enviar formulari/justificant. L'administrador
edita quotes i instruccions des de «Altes i quotes», revisa documents privats,
demana correccions i aprova l'activació de les reserves.

Supabase guarda configuració, import de la sol·licitud i revisió. El bucket
de documents és privat, amb RLS, formats PDF/JPG/PNG, límit de 3 MB i descàrregues
signades de 60 segons. No es marca un pagament com a cobrat només per pujar un
fitxer ni s'executen càrrecs automàtics.

## Comprovacions

- Compilació de producció i TypeScript correctes.
- 30 casos locals correctes del conjunt, més els 8 de reserva repetits després
  d'adaptar els recorreguts E2E a la navegació mòbil existent: 38 casos coberts.
- 20 proves correctes sobre producció, Chromium d'escriptori i mòbil: portada,
  idiomes, fotografies, registre i alta de dos actors amb configuració en viu,
  documents privats, correcció, reenviament i aprovació abans de reservar.
- Cap nova incidència de seguretat a l'auditor de Supabase; es manté l'avís
  preexistent sobre la protecció de contrasenyes filtrades desactivada.
- Eliminats els fitxers i les 11 identitats temporals de prova, amb verificació
  que no queden objectes Storage de la tanda ni credencials de prova al checkout.

L'SMTP propi continua pendent per als correus de confirmació i recuperació
adreçats al públic general. La verificació utilitza comptes temporals confirmats,
sense enviar missatges reals. Les fotografies facilitades són petites; no
s'hi afegeixen detalls generats per IA que puguin alterar les instal·lacions.

Circuit i manteniment: [alta de socis](../membership-onboarding.md).
Fonts i confirmació de quotes/compte/WhatsApp: [origen del contingut](../content-sources.md).
