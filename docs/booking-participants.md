# Reservas, participantes e invitados

La reserva admite individual (dos personas) o dobles (cuatro), independientemente de la duración de 60/90 minutos. Quien reserva se incluye automáticamente. El resto se selecciona entre socios activos con cuenta web o se registra como invitado con nombre y apellidos. La búsqueda devuelve únicamente identificador y nombre, nunca correo o teléfono.

La base de datos valida la modalidad, la cantidad de personas, los socios activos y sus identificadores duplicados. Los nombres de los socios se resuelven en el servidor. La reserva y sus participantes se guardan en una sola transacción, reutilizando las comprobaciones existentes de disponibilidad y horario.

En administración, **Jugadors convidats** muestra participaciones y última fecha, con búsqueda y exportación CSV. Cuenta reservas confirmadas y finalizadas, no cancelaciones ni reservas futuras. Es un registro de reservas, no una comprobación de asistencia. Los nombres se agrupan ignorando mayúsculas y espacios repetidos: los homónimos pueden coincidir y las variantes de escritura pueden quedar separadas. No se recogen datos de contacto adicionales.

Las reservas anteriores conservan su texto de jugadores. No se deduce retrospectivamente quién era socio o invitado. Los socios seleccionados como participantes no reciben acceso a la reserva del organizador: se mantiene la política existente de lectura por propietario y administrador.

## Activación

Aplicar `supabase/migrations/20261102140000_booking_participants.sql` después de las migraciones anteriores y **antes de desplegar este código**. Añade las columnas que consulta el área privada, las funciones de reserva y búsqueda y la sección administrativa. Migración aplicada al proyecto de producción `qubhsueehwdngafjjmrm` el 2 de noviembre de 2026, antes de publicar el código en `main`.

La instantánea antigua `supabase/schema.sql` no sustituye al historial de migraciones.

## Comprobaciones

- `npm run test:participants`: ejecuta la migración real en PostgreSQL local mediante PGlite. Prueba modalidad, nombres canónicos, duplicados, socios inactivos, invitados, exclusión de cancelaciones y acceso administrativo. Sustituye únicamente la función anterior de disponibilidad y la identidad de Supabase por fixtures; no verifica integración remota.
- `npm run test:portal`: prueba en Chromium a 1440 y 390 px la búsqueda, dobles con invitados, confirmación, históricos, resultados y exportación administrativa. Usa respuestas API simuladas y una ruta temporal que se elimina al terminar. Guarda capturas en `artifacts/portal/`. Ejecutar sin un build concurrente y después ejecutar `npm run build` para regenerar los tipos de rutas de Next.
- `npm run build`: compilación de producción y comprobación de tipos.

Los tests existentes de reservas con cuentas reales requieren preparar las fixtures aisladas y aplicar primero la migración.


## Selector de horas

El formulario combina tarjetas de pista con un selector de duración y fecha. La pista Quick seleccionada se muestra en azul; las pistas de tierra batida, en marrón.

La disponibilidad se consulta en un diálogo con tramos de 30 minutos desde la primera hora futura hasta el cierre. Elegir un inicio marca automáticamente dos tramos para una reserva de 60 minutos o tres para 90. No se puede iniciar un intervalo que cruce una ocupación o la hora de cierre. Confirmar la hora cierra el diálogo y conserva el intervalo en el formulario; cerrar o pulsar Escape descarta la selección provisional.

La presentación de reservas, resultados por set y estadísticas personales sigue las referencias de Stitch aportadas por el usuario. Esta actualización no requiere migraciones nuevas.
