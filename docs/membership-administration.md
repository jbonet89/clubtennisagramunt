# Administración y alta de socios

La administración se abre desde una opción de la navegación de socios, visible únicamente para administradores activos. La pantalla y las API mantienen sus controles de autorización. Las direcciones antiguas `/administracio` y `/administracio/adhesions` conducen a `/socis?section=administration`, conservando el idioma. El acceso antiguo `section=members` también redirige a esa sección.

El resumen utiliza el censo unificado y conteos completos, sin depender de los ocho registros de muestra. La migración recupera las cuentas existentes y enlaza su perfil con el socio. Los cambios de estado se sincronizan con el acceso web; un socio histórico solo puede recuperar acceso tras verificar su correo. Las cuentas de administrador quedan protegidas frente a desactivaciones desde el censo.

**Socios** permite buscar y filtrar por estado, documentos y cuotas. Cada ficha reúne datos personales, documentos privados del alta y adjuntos manuales (PDF/JPG/PNG, hasta 3 MB), cuotas e invitación. Documentos y Cuotas dejan de ser secciones independientes. El importe pendiente distingue una cuota cobrada de un mandato SEPA recibido: aprobar un mandato no registra un cobro.

**Nuevo socio** permite guardar una invitación pendiente o incorporar un socio existente. La importación CSV incluye plantilla, vista previa y confirmación; admite hasta 500 filas con correo o referencia histórica, conserva campos vacíos y evita duplicados. No envía correos automáticamente. La exportación respeta los filtros y pagina para superar el límite de respuesta de la API.

El SMTP sigue pendiente. El envío queda desactivado por defecto: configurar SMTP en Supabase y después establecer `MEMBER_INVITATIONS_ENABLED=true` en el entorno del servidor para habilitarlo. No hacen falta claves de servicio. El enlace de correo verifica la cuenta y lleva a completar nombre, teléfono y contraseña; los datos históricos se recuperan por correo verificado. Los errores conservan el socio y no se anuncian como envío realizado.

## Alta y seguimiento

El formulario conserva las cuotas, temporada, banco, IBAN y enlace al documento configurados por el club. Permite elegir categoría y forma de pago; requiere formulario firmado y, para transferencias, justificante. Para SEPA el justificante adicional es opcional, como en el proceso anterior.

Después del envío se muestra una pantalla específica con referencia de solicitud, fecha, modalidad, cuota registrada y documentos recibidos. El importe mostrado procede de la solicitud guardada, aunque cambien las cuotas posteriormente. Los documentos se abren mediante las URL temporales de la API privada existente.

El seguimiento distingue recepción de documentos de validación del pago: una subida de archivos no acredita un cobro. Los pasos siguientes son revisión, activación como socio y habilitación de reservas. No se promete un plazo fijo de aprobación ni se asigna un número de socio desde la interfaz.

Las referencias visuales se adaptan al funcionamiento real: no hay QR, carnet, apertura ni encendido automático. Los focos se pagan aparte por uso y se gestionan en el club. La aplicación no habilita reservas iniciadas por no socios; se conserva la posibilidad existente de incluir invitados en un partido reservado por un socio activo.

## Verificación

`npm run test:membership-ui` ejecuta Chromium a 1440 y 390 px con API simuladas. Comprueba visibilidad del menú, alta por transferencia y SEPA, resumen, documentos, correcciones, aprobación, edición y búsqueda del censo, activación/desactivación web e idiomas CA/ES/EN. Guarda capturas en `artifacts/membership-design/` y elimina la ruta temporal al terminar.

La migracion `20261102155717_unify_member_register.sql` enlaza perfiles y socios, sincroniza estados, incorpora documentos por socio y cuotas por temporada. `npm run test:member-register` verifica recuperacion, duplicados, permisos, importacion y activacion tras verificar correo en una base aislada. Las pruebas visuales usan API simuladas y no crean cuentas ni envian correos reales.
