# Administració: instal·lació i abast

Ruta: `/administracio` (també amb prefix d’idioma). Requereix un compte
administrador actiu, verificat amb el sistema existent.

Aplicar `supabase/migrations/20261102090000_club_administration.sql` al projecte
existent després de les migracions de socis. Sense aquesta migració el panell
mostra un error de configuració i no inventa dades.

«Gestionar seccions» permet activar/desactivar els sis mòduls, conservant dades.
El control de configuració continua disponible encara que es desactivi Permisos,
per evitar bloquejar la recuperació. Tots els administradors actius poden gestionar
els interruptors. RLS bloqueja també les lectures i escriptures de seccions apagades.

Primera versió: cens independent dels comptes web, famílies, quotes manuals,
PDF privats vinculats al número intern del soci i delegació d’administradors.
Els documents accepten PDF de fins a 10 MB, sense substitució; cada càrrega crea
una versió amb identificador nou. Les descàrregues usen enllaços de 60 segons.

Límits: 500 registres per llistat; resum dels registres carregats. Si es desactiva
Socis o Famílies, els selectors dependents poden quedar sense opcions fins que
es reactivi. No hi ha encara permisos granulars, retirada d’administradors,
auditoria, antivirus de PDF, signatura electrònica, remeses, conciliació ni
sincronització automàtica entre el cens i els comptes web. El rol administrador
existent dona accés complet: no delegar-lo com si fos només secretaria.

Verificació pendent en projecte real: aplicar migració, comprovar amb dos comptes
administrador/soci l’alta, edició, càrrega/descàrrega, permisos RLS i interruptors.
No carregar documentació bancària real fins a completar aquesta verificació.
