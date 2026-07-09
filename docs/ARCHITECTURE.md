# Arquitectura

## Diagrama de componentes

Este diagrama está en Mermaid (diagrama-como-código). Para el entregable
visual de la rúbrica (Figma/Miro), pegá este bloque en https://mermaid.live,
exportá como PNG/SVG, e importalo como imagen en tu wireframe de Figma o Miro
— es el mismo diagrama, solo versionado en texto para que viva en el repo.

```mermaid
flowchart TB
    subgraph Cliente
        Browser["Navegador del admin"]
    end

    subgraph Edge["Edge (TLS)"]
        Caddy["Caddy :443\nreverse proxy + HTTPS"]
    end

    subgraph App["Aplicación"]
        Frontend["Next.js Dashboard :3000"]
        Backend["Express.js API :4000\nREST + GraphQL"]
    end

    subgraph Datos["Capa de datos"]
        Postgres[("PostgreSQL\nadmins, señuelos, tokens")]
        Mongo[("MongoDB\ntelemetría cruda")]
        Redis[("Redis\ncache de listados")]
    end

    subgraph Señuelos["Señuelos dinámicos"]
        Docker["Docker Engine API\n(dockerode)"]
        HP1["honeypot-1\nintranet falsa"]
        HP2["honeypot-2\nlogin DB falso"]
    end

    Attacker["Atacante / escaneo no autorizado"]

    Browser -->|HTTPS| Caddy
    Caddy --> Frontend
    Caddy --> Backend
    Frontend -->|REST + GraphQL, JWT| Backend
    Backend --> Postgres
    Backend --> Mongo
    Backend --> Redis
    Backend -->|crea/destruye contenedores| Docker
    Docker --> HP1
    Docker --> HP2
    Attacker -.->|escanea e interactúa| HP1
    HP1 -.->|reporta captura, API_TOKEN| Backend
```

## Flujo de despliegue de un señuelo

```mermaid
sequenceDiagram
    participant A as Admin (dashboard)
    participant B as Backend
    participant D as Docker Engine
    participant H as Contenedor señuelo
    participant P as Postgres

    A->>B: POST /api/honeypots/:id/deploy (JWT)
    B->>P: UPDATE status = 'deploying'
    B->>D: createContainer + start (Env: HONEYPOT_ID, API_TOKEN)
    D-->>H: Contenedor arriba, escuchando :8080
    B->>P: UPDATE status = 'running', container_id
    B-->>A: 200 OK { containerId }

    Note over H: Un atacante interactúa con el señuelo
    H->>B: POST /api/telemetry (API_TOKEN del señuelo)
    B->>B: Mongo: guarda IP, user-agent, credenciales, payload
    A->>B: GET /api/telemetry (polling cada 5s)
    B-->>A: Alertas actualizadas
```

## Por qué Docker Engine API y no Kubernetes para orquestar señuelos

El código de producción usa `dockerode` (API de Docker) para crear y destruir
los contenedores señuelo, no la API de Kubernetes. Es una decisión
consciente, no una carencia:

- El despliegue corre en **una sola VM** (ver `DEPLOY.md`). Un cluster K8s
  completo para orquestar contenedores de vida corta en un solo nodo es
  sobre-ingeniería: agrega un control plane, etcd, kubelet, y complejidad
  operativa sin ningún beneficio real a esta escala.
- `docker-entrypoint` + Docker Engine API ya da todo lo que se necesita:
  creación bajo demanda, red aislada por contenedor, límites de recursos,
  y destrucción limpia al detener el señuelo.
- Si el producto creciera a **multi-nodo** (ej: un señuelo por sucursal en
  varias regiones), ahí sí Kubernetes se justifica — por eso el repo incluye
  `k8s/honeypot-pod-template.yaml` como el diseño de esa migración: el mismo
  patrón (`Env: HONEYPOT_ID, API_TOKEN, BACKEND_URL`) traducido a un `Pod`
  spec, listo para cuando haga falta escalar horizontalmente con
  `@kubernetes/client-node` en lugar de `dockerode`.

## Stack completo

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14, TailwindCSS |
| Backend | Express.js, REST + GraphQL |
| Auth | JWT + OAuth2 (Google) + RBAC (superadmin/operator) |
| Bases de datos | PostgreSQL (control) + MongoDB (telemetría) |
| Cache | Redis (cache-aside, TTL 45s) |
| Orquestación de señuelos | Docker Engine API (dockerode) |
| TLS | Caddy (self-signed en local, Let's Encrypt automático en el VPS) |
| CI/CD | GitHub Actions (test + build + E2E + deploy por SSH) |
| Testing | Jest (unitario backend) + Cypress (E2E frontend) |
