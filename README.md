# Honey-Intranet Orchestrator 🍯

Plataforma web de "engaño táctico" (deception technology). Permite a un
administrador desplegar, con un clic, señuelos web (intranets falsas) dentro
de su red. Si un atacante o insider malicioso cae en la trampa, sus intentos
de acceso quedan capturados y visibles en tiempo real en el dashboard.

## Arquitectura

```
┌─────────────┐   HTTPS/JWT    ┌───────────────┐   dockerode   ┌──────────────────┐
│  Dashboard   │ ─────────────► │   Backend      │ ────────────► │ Contenedor       │
│  Next.js     │ ◄───────────── │   Express      │               │ Señuelo (fake     │
└─────────────┘                 │                │ ◄──telemetría─│ login/intranet)   │
                                 │  ┌──────────┐  │               └──────────────────┘
                                 │  │ Postgres │  │  config, señuelos activos, tokens
                                 │  ├──────────┤  │
                                 │  │  Mongo   │  │  telemetría cruda de ataques (JSON variable)
                                 │  └──────────┘  │
                                 └───────────────┘
```

- **Frontend**: Next.js + Tailwind. Dashboard con lista de señuelos
  (crear/desplegar/detener) y feed de alertas (polling cada 5s). Accesible:
  labels, `aria-live`, `role="alert"`, skip-link y foco visible en toda la UI.
- **Backend**: Express. REST + **GraphQL** (`/graphql`, solo lectura) sobre
  los mismos datos. Autenticación con **JWT + OAuth2 (Google)** y **RBAC** de
  2 roles (`superadmin` crea infraestructura, `operator` opera lo existente).
- **BD híbrida + cache**:
  - **PostgreSQL**: configuración de infraestructura — qué señuelos existen,
    su estado, tokens de acceso, quién los creó. Datos estructurados y estables.
  - **MongoDB**: telemetría cruda de cada intento de ataque (IP, user-agent,
    credenciales probadas, payload completo). El payload que manda un atacante
    varía en forma constantemente — perfecto para un esquema flexible NoSQL.
  - **Redis**: cache-aside del listado de señuelos (TTL 45s), invalidado en
    cada create/deploy/stop.
- **TLS real**: Caddy como reverse proxy en `:443` (self-signed en local,
  Let's Encrypt automático en producción — ver `docs/DEPLOY.md`).
- **CI/CD real**: `.github/workflows/ci.yml` corre Jest + lint + build +
  **Cypress E2E contra el stack completo levantado con docker compose**;
  `deploy.yml` hace deploy automático por SSH a un VPS cuando el CI pasa.
- **DevOps real**: el botón "Desplegar" del dashboard llama a `dockerode`
  (`backend/config/dockerController.js`), que crea y arranca un contenedor
  Docker real a partir de la imagen `honeypot-template`. "Detener" lo apaga
  y elimina. Esto es lo que justifica Docker/K8s como parte funcional del
  producto, no como decoración de rúbrica.

## Uso rápido

1. Correr
   ```bash
   cd honey-intranet
   docker compose up --build
   cloudflared tunnel --url https://localhost:443 --no-tls-verify --http-host-header localhost
   ```
##Copiás la URL que te dé, entrás con /login, y ya está — dashboard funcionando en HTTPS público real.
2. 
3. Crear usuario (queda como superadmin automático)
   ```bash
   curl -X POST http://localhost:4000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"tuclave123"}'
   ```

3. Entrar a sesión con el link que te da el cloudflared, que tiene el siguiente formato(https://passage-publication-bigger-autumn.trycloudflare.com) que corre en el paso 1, este cambia cada vez que se vuelva ejecutar el bash si se ha cerrado antes o es la primera vez que se ejecuta, y despues para hacerlo funcionar loguearte con el usuario creado en el paso 2.

   

4. Nombrar señuelo, crearlo, y tocar "Desplegar" desde el dashboard

5. Simular un ataque
   ```bash
   NOMBRE=$(docker ps --filter "name=honeypot-" --format "{{.Names}}" | grep -v honey-intranet-honeypot-template-1)
   IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $NOMBRE)
   curl -X POST http://$IP:8080/login -d "username=admin&password=1234"
   ```

## Consideraciones

- Esta plataforma es para **defensa de redes propias**, no para atacar
  terceros. Desplegar señuelos dentro de tu propia infraestructura es una
  práctica legítima y común de ciberseguridad (deception technology, ej.
  Cowrie, T-Pot).
- Los datos capturados (IPs, credenciales intentadas) son de quien intenta
  acceder sin autorización a un sistema que no le pertenece — no de usuarios
  legítimos, siempre que el señuelo esté claramente fuera del flujo normal
  de acceso de empleados.
