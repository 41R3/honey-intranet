// Este es el código que corre DENTRO de cada contenedor señuelo.
// Su único trabajo: parecer una intranet real, capturar cualquier intento de acceso
// o inyección, y reportarlo al backend central. No contiene lógica de ataque,
// solo de registro pasivo — es la trampa, no el atacante.

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const HONEYPOT_ID = process.env.HONEYPOT_ID;
const API_TOKEN = process.env.API_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:4000';

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
}

async function reportCapture(req, extra = {}) {
  try {
    await axios.post(
      `${BACKEND_URL}/api/telemetry`,
      {
        honeypotId: HONEYPOT_ID,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        attemptedCredentials: extra.credentials || null,
        payload: { body: req.body, query: req.query, headers: req.headers },
      },
      { headers: { 'x-honeypot-token': API_TOKEN } }
    );
  } catch (err) {
    console.error('No se pudo reportar captura al backend:', err.message);
  }
}

// Página de login falsa de "intranet corporativa"
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Intranet Corporativa - Acceso</title></head>
      <body style="font-family: sans-serif; display:flex; justify-content:center; margin-top:100px;">
        <form method="POST" action="/login" style="border:1px solid #ccc; padding:2rem; border-radius:8px;">
          <h2>Portal Interno</h2>
          <label>Usuario:</label><br/>
          <input name="username" style="margin-bottom:10px; width:250px;"/><br/>
          <label>Contraseña:</label><br/>
          <input name="password" type="password" style="margin-bottom:10px; width:250px;"/><br/>
          <button type="submit">Ingresar</button>
        </form>
      </body>
    </html>
  `);
});

// Cualquier intento de login se captura y se reporta — nunca autentica de verdad
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  await reportCapture(req, { credentials: { username, password } });
  // Respuesta genérica de "credenciales inválidas" para mantener la ilusión
  res.status(401).send('Usuario o contraseña incorrectos.');
});

// Captura cualquier otra ruta (escaneos, intentos de inyección en la URL, etc.)
app.use(async (req, res) => {
  await reportCapture(req);
  res.status(404).send('Not Found');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Señuelo activo en puerto ${PORT}`));
