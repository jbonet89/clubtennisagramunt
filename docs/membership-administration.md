# Administración y alta de socios

La administración se abre desde una opción de la navegación de socios, visible únicamente para administradores activos. La pantalla y las API mantienen sus controles de autorización. Las direcciones antiguas `/administracio` y `/administracio/adhesions` conducen a `/socis?section=administration`, conservando el idioma. El acceso antiguo `section=members` también redirige a esa sección.

El resumen reúne las solicitudes de alta, el censo, las cuotas y las familias. Las cifras proceden de los registros cargados, con los límites actuales de 500 registros por sección y 200 solicitudes. La cola permite revisar los documentos, pedir correcciones, aprobar y consultar las solicitudes ya aprobadas. La configuración de cuotas e instrucciones sigue siendo editable.

El censo administrativo puede contener personas sin cuenta web: su estado no sustituye a la activación del acceso web. Los controles de activar/desactivar cuentas y delegar el rol de administrador están en **Permisos**, usando las mismas API existentes. Aprobar una solicitud desde la cola sigue siendo el proceso normal del alta.

## Alta y seguimiento

El formulario conserva las cuotas, temporada, banco, IBAN y enlace al documento configurados por el club. Permite elegir categoría y forma de pago; requiere formulario firmado y, para transferencias, justificante. Para SEPA el justificante adicional es opcional, como en el proceso anterior.

Después del envío se muestra una pantalla específica con referencia de solicitud, fecha, modalidad, cuota registrada y documentos recibidos. El importe mostrado procede de la solicitud guardada, aunque cambien las cuotas posteriormente. Los documentos se abren mediante las URL temporales de la API privada existente.

El seguimiento distingue recepción de documentos de validación del pago: una subida de archivos no acredita un cobro. Los pasos siguientes son revisión, activación como socio y habilitación de reservas. No se promete un plazo fijo de aprobación ni se asigna un número de socio desde la interfaz.

Las referencias visuales se adaptan al funcionamiento real: no hay QR, carnet, apertura ni encendido automático. Los focos se pagan aparte por uso y se gestionan en el club. La aplicación no habilita reservas iniciadas por no socios; se conserva la posibilidad existente de incluir invitados en un partido reservado por un socio activo.

## Verificación

`npm run test:membership-ui` ejecuta Chromium a 1440 y 390 px con API simuladas. Comprueba visibilidad del menú, alta por transferencia y SEPA, resumen, documentos, correcciones, aprobación, edición y búsqueda del censo, activación/desactivación web e idiomas CA/ES/EN. Guarda capturas en `artifacts/membership-design/` y elimina la ruta temporal al terminar.

Esta actualización no cambia el esquema ni las API de base de datos y no necesita una migración. Las pruebas visuales no crean cuentas, documentos, socios ni pagos en el servicio real. Las pruebas anteriores con cuentas reales siguen requiriendo fixtures aisladas.
