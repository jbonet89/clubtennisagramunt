# CTA: configuracion inicial

La base de Next.js y los clientes Supabase estan preparados tras recibir
la configuracion publica y la URL del repositorio. No se ha desplegado
ningun servicio todavia.

## 1. GitHub

Repositorio confirmado: https://github.com/jbonet89/clubtennisagramunt.
Esta carpeta tiene ese repositorio configurado como remoto `origin`.
No hacen falta contrasenas ni tokens pegados en el chat.

## 2. Supabase

Accede a https://supabase.com/dashboard con
`clubtennisagramunt1974@gmail.com` y crea o selecciona el proyecto CTA.
Guarda su contrasena de base de datos en tu gestor de contrasenas.

Desde el dialogo Connect o la configuracion del proyecto, copia la URL y las
claves a `.env.local`. Elige una de estas parejas, sin mezclar proyectos:

- Preferida: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`.
- Compatibilidad con la mision: `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
  `SUPABASE_SERVICE_ROLE_KEY`.

Las claves secret y service_role son exclusivamente del servidor y pueden
omitir RLS. Nunca deben llevar el prefijo NEXT_PUBLIC_. Las tablas y sus
politicas RLS se crearan en la fase de implementacion.

Referencia: https://supabase.com/docs/guides/getting-started/api-keys

## 3. Archivo local

En PowerShell, desde esta carpeta, ejecuta una sola vez:

```powershell
Copy-Item -LiteralPath .env.example -Destination .env.local
```

Si `.env.local` ya existe, editalo sin sobrescribirlo. Completa las claves
directamente en el archivo, sin enviarlas al chat. `.gitignore` excluye los
archivos de entorno locales y conserva unicamente la plantilla sin secretos.

Mantén `NEXT_PUBLIC_SITE_URL=http://localhost:3000` para desarrollo.

## 4. Stripe de pruebas

Crea o selecciona un sandbox de Stripe. Copia sus claves `sk_test_...` y
`pk_test_...` a las variables correspondientes. El secreto `whsec_...` pertenece
al webhook y es diferente de la clave de API.

El endpoint previsto es `/api/webhooks/stripe`, con el evento
`checkout.session.completed`. Cuando exista el servidor, se podra iniciar
el reenvio local con Stripe CLI y guardar su secreto de firma en
`STRIPE_WEBHOOK_SECRET`. Si aun no dispones del secreto del webhook,
indicalo para preparar esa fase; no inventes un valor.

Referencia: https://docs.stripe.com/keys

## 5. Vercel

Accede a https://vercel.com con `clubtennisagramunt1974@gmail.com` y conecta
el repositorio de `jbonet89`. No necesitas proporcionar una contrasena ni
un token de Vercel en `.env.local`.

Cuando exista el proyecto Next.js, importa el repositorio y configura sus
variables de entorno para los entornos que correspondan. Usa claves de
prueba en desarrollo y previews. En produccion, configura la URL HTTPS
real en `NEXT_PUBLIC_SITE_URL`. El secreto de webhook desplegado debe ser
el de ese endpoint, no el del reenvio local.

Referencia: https://vercel.com/docs/environment-variables

## 6. Integraciones pendientes

Mantén `SMART_LOCK_PROVIDER=mock` y `PLAYTOMIC_SANDBOX=true` hasta disponer
de proveedor y acceso de produccion. Las claves y los identificadores de
esas integraciones pueden quedar vacios en esta fase. El modo mock no
abrira una puerta real ni sincronizara reservas externas.

La entrega de correos con el PIN requerira elegir y configurar un proveedor
de correo durante la implementacion; las variables de la mision no incluyen
todavia ese servicio.

## Para continuar

Supabase publico configurado para el proyecto `qubhsueehwdngafjjmrm`.
Para administrar el proyecto mediante MCP, conecta una cuenta con acceso
a ese proyecto. Las conexiones disponibles durante la preparacion no lo
incluian. La clave publica permite acceso a las APIs de la aplicacion, pero
no sustituye la autorizacion administrativa MCP.

Vercel: proyecto `clubtennisagramunt` creado en el equipo
`ClubTennisAgramunt`, desde el repositorio indicado y la rama `main`.
La URL publica y la clave publishable de Supabase estan guardadas para
Production y Preview. La integracion nativa de Marketplace es opcional y
su instalacion aun no se ha confirmado. El despliegue tampoco se ha
verificado todavia.

Stripe sigue pendiente. Si falta alguna credencial, indica solo su nombre.
No compartas sus valores secretos.
