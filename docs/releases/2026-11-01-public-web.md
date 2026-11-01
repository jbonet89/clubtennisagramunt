# Primera entrega pública · 1 de novembre de 2026

Publicada a https://clubtennisagramunt.vercel.app/ca.
Commit de la funcionalitat: `99676581b10d0277cada6df17d444012bb3d2f26`.
Estat Vercel: `success`.

## Inclou

- Portada amb el logotip original, història, arxiu de 2018 i contacte.
- Català predeterminat a `/ca`, castellà a `/es` i anglès a `/en`.
- Selector interactiu de terra batuda / Quick i parallax SVG amb Motion.
- Navegació mòbil, ús amb teclat i respecte al moviment reduït.
- Crides per fer-se soci i consultar disponibilitat per correu.
- Metadades per idioma, canonical, alternates, sitemap i robots.
- Pla de fases, dependències i criteris d'acceptació.

## Verificació

- `npm run build`: correcte.
- `npm run typecheck`: correcte.
- `npm run test:e2e`: 18 proves correctes en Chromium d'escriptori i mòbil.
- Revisió de captures locals d'escriptori i mòbil.
- Producció: `/ca`, `/es` i `/en` amb HTTP 200, idioma i títol corresponents.
- 2 proves E2E addicionals contra producció: canvi CA/ES/EN i selector de pistes.

## Pendent

La reserva en línia i l'accés de socis encara no estan implementats. La portada
ho explica i deriva les consultes al correu del club. El refinament d'animacions
ScrollCraft continua al pla; les fases següents tenen les seves pròpies proves.
