# Guía de despliegue (gratis)

Recomendación: **Oracle Cloud Free Tier**. Es la única opción gratuita que da
una VM de verdad con Docker corriendo nativo (no serverless) — necesario
porque el backend usa el socket de Docker del host para crear los
contenedores señuelo al vuelo. Fly.io/Railway no sirven para esta parte
porque no dan acceso al socket de Docker.

## 1. Crear la VM (una sola vez)

1. Entrá a https://www.oracle.com/cloud/free/ y creá una cuenta (pide
   tarjeta solo para verificar identidad, no cobra nada en el tier free).
2. Creá una instancia **Ampere A1** (ARM, siempre gratis): 4 OCPU / 24GB RAM.
   Elegí Ubuntu 22.04 como imagen.
3. Al crearla, descargá la clave SSH privada que te ofrece — esa es la que
   va a `DEPLOY_SSH_KEY` en GitHub más abajo.
4. Abrí el puerto 443 en el "Security List" de la VCN (por defecto Oracle
   solo abre el 22).

## 2. Preparar la VM

```bash
ssh -i tu-clave.pem ubuntu@<IP_DE_LA_VM>

# Instalar Docker + compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin
newgrp docker

# Clonar el repo
git clone https://github.com/TU_USUARIO/honey-intranet.git
cd honey-intranet
cp backend/.env.example backend/.env
nano backend/.env   # poné un JWT_SECRET real: openssl rand -hex 32

# Usar el Caddyfile de producción con tu dominio real (si tenés uno)
# o dejá el Caddyfile de desarrollo si vas a entrar por IP con warning de cert
cp Caddyfile.prod Caddyfile   # y reemplazá "tu-dominio.com" adentro

docker compose up -d --build
```

Con eso ya está corriendo igual que en tu máquina.

## 3. Conectar GitHub Actions para deploy automático

En tu repo de GitHub: **Settings → Secrets and variables → Actions → New
repository secret**, cargá:

| Secret | Valor |
|---|---|
| `DEPLOY_HOST` | La IP pública de tu VM |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | El contenido completo de tu clave privada `.pem` |

Con eso, cada push a `main` que pase el CI dispara `deploy.yml`, que entra
por SSH y corre `git pull && docker compose up -d --build` solo.

## 4. (Opcional) Login con Google — OAuth2

1. Andá a https://console.cloud.google.com/apis/credentials (gratis).
2. Creá un "OAuth client ID" tipo "Web application".
3. En "Authorized JavaScript origins" agregá tu dominio (o `http://localhost:3000` para probar local).
4. Copiá el `Client ID` generado a `GOOGLE_CLIENT_ID` en `backend/.env`.
5. Sin este paso, el login con Google queda deshabilitado automáticamente
   (`501 Not Implemented`) y el login con email+password sigue funcionando
   exactamente igual — no rompe nada dejarlo vacío.

## 5. Verificar que quedó bien

```bash
curl -vk https://<IP_O_DOMINIO>/          # deberías ver el handshake TLS
curl https://<IP_O_DOMINIO>/api/honeypots -k  # 401 esperado sin token, confirma que responde
```
