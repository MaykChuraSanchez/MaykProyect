# Arquitectura objetivo · Suma en Vercel

## Stack recomendado

| Capa | Elección | Motivo |
| --- | --- | --- |
| Frontend | Next.js (App Router) + React + TypeScript | Render híbrido, Route Handlers y despliegue nativo en Vercel. |
| API | Route Handlers de Next.js sobre Node.js | OAuth, webhooks y motor de ingesta sin exponer secretos al cliente. |
| Identidad | Auth.js con Google | Sesiones por usuario independientes del permiso adicional de Gmail. |
| Datos | Postgres administrado por Neon desde Vercel Marketplace + Drizzle ORM | Persistencia serverless, migraciones y separación por `user_id`. |
| Archivos | Vercel Blob privado o R2 mediante API S3 | Los comprobantes nunca se sirven como objetos públicos. |
| Eventos | Gmail `users.watch` → Google Cloud Pub/Sub → webhook → cola | Ingesta automática, reintentos e idempotencia. |
| Observabilidad | Vercel Logs + eventos de ingesta | Cada correo tiene estado, error, huella y movimiento resultante. |

La UI y los Route Handlers ya siguen el modelo de App Router. La versión actualmente
publicada usa el adaptador Cloudflare D1; antes del primer despliegue en Vercel se debe
ejecutar la migración controlada de `sqlite-core`/D1 a `pg-core`/Neon y reemplazar el
adaptador de `db/index.ts`. No se debe conectar una base productiva hasta validar esa
migración en Preview.

## Flujo de Gmail

1. El usuario elige **Conectar con Google**.
2. `/api/integrations/gmail/connect` crea un `state` firmado, solicita
   `gmail.readonly` y acceso offline.
3. El callback intercambia el código, cifra el refresh token con AES-256-GCM y guarda
   una conexión asociada al `user_id`.
4. Gmail `users.watch` publica cambios en Pub/Sub. El webhook identifica la cuenta y
   envía un trabajo a la cola.
5. El worker consulta mensajes nuevos, valida remitente + autenticación + asunto,
   extrae los datos y genera una huella idempotente.
6. El Motor de Ingesta crea un movimiento **Por revisar**. Las transferencias entre
   cuentas no alteran balances hasta confirmar origen y destino.

La consulta de respaldo para los dos bancos es:

```text
(from:notificaciones@notificacionesbcp.com.pe OR from:servicioalcliente@netinterbank.com.pe)
```

El `watch` de Gmail debe renovarse de forma periódica; se recomienda una tarea diaria.
También conviene una reconciliación periódica por `historyId`, porque las notificaciones
push pueden retrasarse o perderse.

## Variables y secretos

Copiar `.env.example` a `.env.local` solo para desarrollo. En Vercel, declarar los
secretos por ambiente (Development, Preview y Production). Ningún secreto debe llevar
el prefijo `NEXT_PUBLIC_`.

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: cliente OAuth tipo Web.
- `GOOGLE_REDIRECT_URI`: en producción,
  `https://TU-DOMINIO/api/integrations/gmail/callback`.
- `TOKEN_ENCRYPTION_KEY`: 32 bytes en Base64URL; rotar mediante proceso versionado.
- `GMAIL_STATE_SECRET`: firma del `state` y defensa CSRF.
- `GMAIL_PUBSUB_TOPIC`: topic autorizado para `users.watch`.
- `PUBSUB_AUDIENCE`, `PUBSUB_SERVICE_ACCOUNT_EMAIL`: validación criptográfica del token OIDC de Pub/Sub.
- `DATABASE_URL`: inyectada por la integración de Neon.
- `AUTH_SECRET`: clave de sesión de Auth.js.

Marcar `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `GMAIL_STATE_SECRET`,
`DATABASE_URL` y `AUTH_SECRET` como secretos sensibles.
Después de cambiar una variable hay que crear un nuevo deployment para aplicarla.

## Paleta ejecutiva

| Rol | HEX | Aplicación |
| --- | --- | --- |
| Marino institucional | `#0F293A` | Sidebar y navegación principal. |
| Azul marino de acción | `#123F5A` | Botones, enlaces y foco principal. |
| Azul acero | `#3D748F` | Gráficas, estados informativos e iconos. |
| Verde financiero | `#13805F` | Ingresos, salud y confirmaciones. |
| Fondo frío | `#F3F6F8` | Lienzo general de baja fatiga visual. |
| Superficie | `#FFFFFF` | KPIs, tablas y paneles. |
| Texto pizarra | `#152331` | Texto principal de alto contraste. |
| Texto secundario | `#647483` | Metadatos y ayudas. |
| Borde | `#DCE4E9` | Separadores discretos. |
| Alerta | `#B97A22` | Riesgo moderado y revisión pendiente. |
| Error | `#B93846` | Acciones destructivas y fallos. |

Regla de uso: marino para estructura, azul acero para información, verde únicamente
para resultados favorables y ámbar/rojo solo cuando hay algo accionable. Las cifras de
KPI usan texto pizarra sobre blanco; nunca se codifica un resultado únicamente por color.

## Checklist de despliegue

1. Crear proyecto Vercel importando el repositorio GitHub.
2. Migrar D1 a Neon en un ambiente Preview y validar conteos, sumas y ownership.
3. Registrar los redirect URI de Preview y Production en Google Cloud.
4. Configurar Pub/Sub y dar permiso de publicación a Gmail.
5. Añadir variables por ambiente y ejecutar migraciones antes de promover Production.
6. Validar OAuth, deduplicación, BCP, Interbank, rotación de token y reintentos.
7. Promover a Production y renovar `users.watch` diariamente.
