const express = require('express');
const pool = require('../config/postgres');
const { getDb } = require('../config/mongo');
const { authenticate, authenticateHoneypot } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/telemetry - el CONTENEDOR SEÑUELO llama aquí cuando alguien cae en la trampa.
// No requiere JWT de admin, requiere el token propio del honeypot (x-honeypot-token).
router.post('/', authenticateHoneypot, async (req, res) => {
  const { honeypotId, ip, userAgent, attemptedCredentials, payload } = req.body;

  try {
    // Verifica que el token corresponda a ese honeypotId específico
    const check = await pool.query(
      'SELECT id FROM honeypots WHERE id = $1 AND api_token = $2',
      [honeypotId, req.honeypotToken]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Token inválido para este señuelo' });
    }

    const db = getDb();
    await db.collection('telemetry').insertOne({
      honeypotId,
      ip,
      userAgent,
      attemptedCredentials, // ej: { user: 'admin', pass: 'admin123' }
      payload,              // cualquier cosa cruda que el atacante haya mandado (JSON impredecible)
      capturedAt: new Date(),
    });

    logger.warn('Intruso capturado en señuelo', { honeypotId, ip });
    res.status(201).json({ ok: true });
  } catch (err) {
    logger.error('Error guardando telemetría', { error: err.message });
    res.status(500).json({ error: 'Error al guardar telemetría' });
  }
});

// GET /api/telemetry - el DASHBOARD consulta aquí las alertas (requiere admin JWT)
router.get('/', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const alerts = await db
      .collection('telemetry')
      .find({})
      .sort({ capturedAt: -1 })
      .limit(100)
      .toArray();
    res.json(alerts);
  } catch (err) {
    logger.error('Error obteniendo telemetría', { error: err.message });
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});

module.exports = router;
