# Caso de negocio — Honey-Intranet Orchestrator

## Problema
Las redes gubernamentales y comerciales suelen enterarse de una intrusión
recién cuando el atacante ya se movió lateralmente y causó daño. La defensa
pasiva (firewalls, antivirus) no genera señales tempranas de "alguien está
escaneando mi red ahora mismo".

## Solución
Una plataforma SaaS que despliega señuelos web (intranets falsas, paneles de
login falsos de bases de datos) dentro de la red real. Cualquier interacción
con esos señuelos es, por definición, sospechosa — nadie legítimo tiene
razón para tocar un sistema que no existe de verdad. Esto da alertas de
altísima confianza y cero falsos positivos por diseño.

## Usuarios objetivo
- Administradores de TI en entidades de gobierno (municipios, ministerios).
- Equipos de seguridad de empresas medianas sin presupuesto para un SOC 24/7.

## Propuesta de valor
- **Detección temprana**: alerta en el momento del primer intento de acceso,
  no después del incidente.
- **Cero fricción operativa**: un clic despliega el señuelo, no requiere
  tocar la infraestructura productiva.
- **Evidencia forense lista**: IP, user-agent, credenciales intentadas y
  payload quedan capturados automáticamente para una eventual denuncia.

## Modelo de datos híbrido (justificación técnica)
| Motor | Qué guarda | Por qué este motor |
|---|---|---|
| PostgreSQL | Admins, roles, señuelos, tokens | Datos relacionales con integridad referencial fuerte (un señuelo pertenece a un admin, un token es único) |
| MongoDB | Telemetría cruda de ataques | El payload de un atacante es impredecible (JSON arbitrario, campos que varían según la técnica usada) — forzarlo a un esquema rígido perdería información |
| Redis | Cache del listado de señuelos | Se consulta cada 5s desde el dashboard (polling); cachear 45s evita pegarle a Postgres en cada refresh sin sacrificar frescura |

## Seguridad y ética
- Los señuelos solo capturan actividad de quien decide interactuar con un
  sistema que no debería tocar — no hay recolección de datos de usuarios
  legítimos.
- Los tokens de API por señuelo son de un solo uso por contenedor y se
  invalidan al detenerlo.
- RBAC de 2 niveles: solo un `superadmin` puede crear nueva infraestructura
  de señuelos; un `operator` solo puede desplegar/detener lo ya aprobado.

## Sostenibilidad tecnológica
Los señuelos se destruyen al detenerse (no quedan contenedores huérfanos
consumiendo recursos), y el stack corre completo en una sola VM pequeña
gracias a Docker — no se necesita sobre-aprovisionar un cluster para el
volumen de tráfico esperado (señuelos, no producción real).
