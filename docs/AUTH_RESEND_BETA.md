# Autenticación de Suma: Supabase Auth + Resend

Documento operativo para la beta de `https://suma-finanzas.vercel.app`.

## Decisión de arquitectura

- Supabase Auth administra registro, confirmación, sesiones, cierre de sesión,
  reenvío de confirmación y recuperación de contraseña.
- El navegador usa únicamente la URL pública y la publishable key de Supabase.
- Supabase envía los correos de Auth mediante Custom SMTP. No existe un backend
  propio de email y Suma no necesita la SDK de Resend.
- La API key de Resend debe vivir únicamente en el campo **Password** de Custom
  SMTP en Supabase Dashboard. No debe existir en el repositorio ni en Vercel.
- Los callbacks públicos son `/auth/confirm` y `/auth/reset`.

## Restricción actual de Resend sin dominio

La documentación vigente de Resend indica que SMTP requiere una API key y un
dominio verificado. También indica que se debe añadir y verificar al menos un
dominio para enviar correo. Por eso, sin comprar o verificar un dominio no es
posible usar Resend SMTP para entregar confirmaciones reales a usuarios externos.
Las direcciones `delivered@resend.dev`, `bounced@resend.dev` y similares solo
simulan eventos y no son buzones desde los que una persona pueda confirmar Suma.

El código queda listo y no necesitará cambios cuando exista un remitente
verificado. Hasta entonces:

- el SMTP predeterminado de Supabase solo entrega a miembros autorizados del
  equipo del proyecto y tiene límites estrictos;
- Resend Test Mode permite probar eventos, pero no completa el recorrido de un
  usuario externo real;
- no se debe inventar un remitente ni usar `onboarding@resend.dev` como solución
  para una beta externa.

## Configuración manual en Resend

1. Entrar en `https://resend.com/api-keys`.
2. Conservar la API key existente en un gestor seguro. No pegarla en GitHub,
   Vercel, archivos `.env`, incidencias, capturas ni este chat.
3. No crear otra clave por ahora salvo que la existente haya sido expuesta. Si
   fue expuesta, revocarla y crear una nueva con permiso de envío.
4. Como no habrá dominio propio por ahora, detener aquí la configuración de
   entrega real. Custom SMTP de Resend no está habilitable de forma soportada
   para destinatarios externos sin un dominio verificado.
5. Cuando se autorice un dominio, ir a **Domains > Add domain**, añadir de
   preferencia un subdominio transaccional (por ejemplo `auth.dominio.tld`),
   crear los registros DNS mostrados y esperar el estado **Verified**.
6. Mantener desactivado el seguimiento de clics para emails de Auth, porque la
   reescritura de enlaces puede romper confirmación y recuperación.

## Configuración manual en Supabase

### URL Configuration

1. Abrir Supabase Dashboard y seleccionar el proyecto de Suma.
2. Ir a **Authentication > URL Configuration**.
3. Establecer **Site URL** exactamente como:
   `https://suma-finanzas.vercel.app`
4. En **Redirect URLs**, añadir exactamente:
   - `https://suma-finanzas.vercel.app/auth/confirm`
   - `https://suma-finanzas.vercel.app/auth/reset`
5. Para desarrollo local, añadir solo si se va a probar localmente:
   - `http://localhost:3000/auth/confirm`
   - `http://localhost:3000/auth/reset`
6. No hace falta un comodín para producción. Las dos rutas exactas reducen la
   superficie de redirecciones abiertas. Los previews de Vercel requerirían una
   regla separada y no son necesarios para la beta pública.

### Custom SMTP con Resend (cuando haya dominio verificado)

1. Ir a **Authentication > Emails > SMTP Settings**.
2. Activar **Enable Custom SMTP**.
3. Completar:
   - **Sender email**: una dirección del dominio verificado, por ejemplo
     `no-reply@auth.dominio.tld`.
   - **Sender name**: `Suma`.
   - **Host**: `smtp.resend.com`.
   - **Port**: `465`.
   - **Username**: `resend`.
   - **Password**: pegar personalmente la API key de Resend.
4. Guardar. La contraseña es el único lugar donde debe pegarse la API key.
5. No compartir el contenido de **Password**, la API key ni capturas que la
   muestren. Suma, GitHub y Vercel no necesitan esa clave.
6. Confirmar en **Authentication > Providers > Email** que Email está activo y
   que la confirmación de correo permanece requerida; no activar autoconfirm.
7. Revisar **Authentication > Rate Limits**. Supabase aplica inicialmente un
   límite bajo al SMTP personalizado; para una beta pequeña se recomienda
   mantenerlo conservador y elevarlo solo si aparecen bloqueos legítimos.

### Plantillas de correo

Ir a **Authentication > Emails > Templates**. Conservar exactamente el
placeholder `{{ .ConfirmationURL }}`.

#### Confirm signup

Asunto: `Confirma tu cuenta en Suma`

```html
<h2>Confirma tu correo</h2>
<p>Confirma tu correo para terminar de crear tu cuenta en Suma.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi cuenta</a></p>
<p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
```

#### Reset password / Recovery

Asunto: `Cambia tu contraseña de Suma`

```html
<h2>Cambia tu contraseña</h2>
<p>Recibimos una solicitud para cambiar tu contraseña.</p>
<p><a href="{{ .ConfirmationURL }}">Cambiar contraseña</a></p>
<p>Si no hiciste esta solicitud, puedes ignorar este mensaje.</p>
```

#### Magic Link

Asunto: `Tu enlace para ingresar a Suma`

```html
<h2>Ingresa a Suma</h2>
<p>Usa este enlace seguro para ingresar a tu cuenta.</p>
<p><a href="{{ .ConfirmationURL }}">Ingresar a Suma</a></p>
<p>Si no solicitaste el enlace, puedes ignorar este mensaje.</p>
```

#### Change email address

Asunto: `Confirma tu nuevo correo en Suma`

```html
<h2>Confirma tu nuevo correo</h2>
<p>Solicitaste cambiar el correo de tu cuenta de Suma a {{ .NewEmail }}.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar nuevo correo</a></p>
<p>Si no solicitaste este cambio, protege tu cuenta.</p>
```

## Variables de entorno

| Variable                               | Ubicación                                    | Clasificación                    |
| -------------------------------------- | -------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_APP_URL`                  | Vercel Production/Preview/Development        | Pública                          |
| `NEXT_PUBLIC_SUPABASE_URL`             | Vercel Production/Preview/Development        | Pública                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel Production/Preview/Development        | Pública y de privilegio limitado |
| `DATABASE_URL` o `POSTGRES_URL`        | Vercel, solo runtime servidor                | Privada                          |
| `GOOGLE_CLIENT_ID`                     | Vercel, solo servidor                        | Privada operacional              |
| `GOOGLE_CLIENT_SECRET`                 | Vercel, solo servidor                        | Secreta                          |
| `GOOGLE_REDIRECT_URI`                  | Vercel, solo servidor                        | Privada operacional              |
| `TOKEN_ENCRYPTION_KEY`                 | Vercel, solo servidor                        | Secreta                          |
| `GMAIL_STATE_SECRET`                   | Vercel, solo servidor                        | Secreta                          |
| `GMAIL_PUBSUB_TOPIC`                   | Vercel, solo servidor                        | Privada operacional              |
| `PUBSUB_AUDIENCE`                      | Vercel, solo servidor                        | Privada operacional              |
| `PUBSUB_SERVICE_ACCOUNT_EMAIL`         | Vercel, solo servidor                        | Privada operacional              |
| `APP_SINGLE_USER_ID`                   | Solo desarrollo local; ausente en producción | Privada / bypass de desarrollo   |
| `RESEND_API_KEY`                       | Solo Password de Custom SMTP en Supabase     | Secreta                          |

La URL y la publishable key de Supabase pueden estar en el navegador por
diseño. Nunca deben sustituirse por `service_role` ni por una secret key.

## Almacenamiento actual

| Área                                      | Almacenamiento actual                                   | Observación                                  |
| ----------------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| Sesión Supabase                           | `localStorage`, administrado por `supabase-js`          | Persistente y con refresh automático         |
| Tema                                      | `localStorage` (`suma-theme`)                           | Preferencia del navegador                    |
| Cuentas locales de fallback               | `localStorage`                                          | Solo aparece si faltan variables de Supabase |
| Ingresos y gastos                         | `localStorage` por correo                               | No sincroniza dispositivos                   |
| Cuentas y tarjetas                        | `localStorage` por correo                               | No sincroniza dispositivos                   |
| Préstamos/pendientes                      | `localStorage` por correo                               | No sincroniza dispositivos                   |
| Presupuestos, metas, reglas y recurrentes | `localStorage` por correo                               | No sincroniza dispositivos                   |
| Boletas procesadas                        | Datos extraídos en `localStorage`; imagen no persistida | OCR en el navegador                          |
| Movimientos Gmail                         | PostgreSQL vía API y mezcla en la UI                    | Implementación parcial en nube               |

No se usa IndexedDB para los datos financieros.

## Migración siguiente: PostgreSQL + RLS

No se ejecuta todavía para evitar pérdida de datos. La migración propuesta es:

1. Crear `profiles(id uuid primary key references auth.users(id) on delete cascade, ...)`.
2. Crear o adaptar `transactions`, `accounts`, `credit_cards`, `loans`,
   `budgets`, `savings_goals`, `recurring_rules`, `categorization_rules` y
   `attachments` con `user_id uuid not null references auth.users(id) on delete cascade`.
3. Activar RLS en cada tabla.
4. Añadir políticas separadas de `select`, `insert`, `update` y `delete` usando
   `(select auth.uid()) = user_id`; indexar cada `user_id`.
5. Crear una importación idempotente desde el `localStorage` del usuario hacia
   PostgreSQL, con confirmación y copia de seguridad antes de borrar local.
6. Cambiar la UI para leer y escribir Supabase; usar estado optimista y cola de
   reintentos para conexiones móviles intermitentes.
7. Probar aislamiento con dos usuarios distintos antes de activar la migración.
8. Retirar el fallback local únicamente cuando la sincronización esté validada.

El esquema existente ya contiene tablas y políticas preliminares, pero usa
`user_id text` y aún no es la fuente principal de la interfaz. Debe migrarse a
UUID/FK de manera no destructiva y por etapas.

## Prueba real después de configurar un SMTP válido

- [ ] Crear cuenta con un Gmail distinto al del propietario.
- [ ] Ver el envío en el registro del proveedor SMTP.
- [ ] Recibir el email y revisar spam.
- [ ] Abrir **Confirmar mi cuenta**.
- [ ] Volver a `/auth/confirm` y ver el mensaje de éxito.
- [ ] Iniciar sesión.
- [ ] Cerrar sesión y confirmar que no quedan datos privados visibles.
- [ ] Solicitar recuperación desde el login.
- [ ] Abrir `/auth/reset`, establecer una contraseña y volver a iniciar sesión.
- [ ] Reenviar confirmación desde el login.
- [ ] Repetir en celular y computadora.

