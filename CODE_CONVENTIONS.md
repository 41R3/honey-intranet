# Convenciones de código
```js
// Correcto:
async function deployHoneypot({ image, honeypotId, apiToken }) {
  logger.info('Señuelo desplegado', { honeypotId, containerId });
}
```

## Backend (Express)
- **Todo async/await**, nunca `.then()` encadenado.
- **Un try/catch por handler de ruta**, nunca dejar una promesa sin capturar.
- **Errores siempre en formato `{ error: "mensaje en español" }`**, con el
  status HTTP correcto (400 validación, 401 sin auth, 403 sin permiso, 404
  no existe, 500 error del servidor).
- **Logging estructurado con `winston`** (`logger.info`/`logger.error` con
  objeto de contexto), nunca `console.log` suelto en rutas.
- **RBAC explícito por ruta**: `requireRole('superadmin')` se declara en la
  firma de la ruta, no adentro del handler — se lee de un vistazo qué rol
  necesita cada endpoint sin entrar al código.
- **Un archivo de config por integración externa** (`config/postgres.js`,
  `config/mongo.js`, `config/redis.js`, `config/dockerController.js`) — cada
  uno expone solo lo que el resto de la app necesita, nunca el cliente
  crudo de la librería.

## Frontend (Next.js)
- **Componentes funcionales únicamente**, props desestructuradas en la
  firma: `function HoneypotCard({ honeypot, onDeploy, onStop })`.
- **`'use client'` solo donde hace falta** (hooks, interactividad) — todo
  lo demás se deja como Server Component por default de Next.js 14.
- **TailwindCSS con clases utilitarias directas en el JSX**, sin CSS
  modules ni styled-components — un solo sistema de estilos en todo el
  proyecto.
- **Cada componente presentacional (`components/`) tiene su
  `.stories.js`** — ver `HoneypotCard.stories.js` y `AlertRow.stories.js`
  como referencia. Corré `npm run storybook` para verlos.

## Base de datos
- **Postgres: `snake_case`** para tablas y columnas (`api_token`,
  `created_by`), estándar SQL.
- **Mongo: `camelCase`** para campos del documento (`attemptedCredentials`,
  `capturedAt`), estándar JS/JSON.

## Git
- Commits en español, en imperativo: `"Agregar RBAC a rutas de señuelos"`,
  no `"agregué"` ni `"adding RBAC"`.
- Un commit por cambio lógico completo (no mezclar un fix de bug con una
  feature nueva en el mismo commit).
