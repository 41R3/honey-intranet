const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/postgres');
const { client: redis } = require('../config/redis');
const { authenticate, requireRole } = require('../middleware/auth');
const { deployHoneypot, stopHoneypot, getContainerStatus } = require('../config/dockerController');
const logger = require('../utils/logger');

const router = express.Router();

const HONEYPOT_LIST_CACHE_KEY = 'honeypots:list';
const HONEYPOT_LIST_TTL_SECONDS = 45;

// El estado de los señuelos cambia con cada deploy/stop, así que cada vez
// que mutamos algo invalidamos el cache en vez de esperar a que expire solo.
async function invalidateHoneypotListCache() {
  try {
    await redis.del(HONEYPOT_LIST_CACHE_KEY);
  } catch (err) {
    logger.error('Error invalidando cache de señuelos', { error: err.message });
  }
}

// GET /api/honeypots - lista todos los señuelos con su estado (cache-aside)
router.get('/', authenticate, async (req, res) => {
  try {
    const cached = await redis.get(HONEYPOT_LIST_CACHE_KEY).catch(() => null);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await pool.query(
      `SELECT h.id, h.name, h.status, h.container_id, h.deployed_at, t.name AS template_name
       FROM honeypots h
       JOIN honeypot_templates t ON t.id = h.template_id
       ORDER BY h.created_at DESC`
    );

    redis
      .set(HONEYPOT_LIST_CACHE_KEY, JSON.stringify(result.rows), { EX: HONEYPOT_LIST_TTL_SECONDS })
      .catch((err) => logger.error('Error guardando cache de señuelos', { error: err.message }));

    res.json(result.rows);
  } catch (err) {
    logger.error('Error listando señuelos', { error: err.message });
    res.status(500).json({ error: 'Error al listar señuelos' });
  }
});

// GET /api/honeypots/templates - plantillas disponibles para crear un señuelo
router.get('/templates', authenticate, async (req, res) => {
  const result = await pool.query('SELECT * FROM honeypot_templates');
  res.json(result.rows);
});

// POST /api/honeypots - registra un señuelo nuevo (aún no desplegado).
// Cambiar la infraestructura disponible es cosa de 'superadmin', no de
// cualquier operador que solo debería poder desplegar/detener lo existente.
router.post('/', authenticate, requireRole('superadmin'), async (req, res) => {
  const { name, templateId } = req.body;
  if (!name || !templateId) return res.status(400).json({ error: 'Faltan campos' });

  const apiToken = uuidv4();
  try {
    const result = await pool.query(
      `INSERT INTO honeypots (name, template_id, api_token, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id, name, status`,
      [name, templateId, apiToken, req.admin.id]
    );
    await invalidateHoneypotListCache();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Error creando señuelo', { error: err.message });
    res.status(500).json({ error: 'Error al crear señuelo' });
  }
});

// POST /api/honeypots/:id/deploy - levanta el contenedor Docker real.
// Tanto 'superadmin' como 'operator' pueden operar señuelos ya existentes.
router.post('/:id/deploy', authenticate, requireRole('superadmin', 'operator'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT h.*, t.docker_image FROM honeypots h
       JOIN honeypot_templates t ON t.id = h.template_id
       WHERE h.id = $1`,
      [id]
    );
    const honeypot = result.rows[0];
    if (!honeypot) return res.status(404).json({ error: 'Señuelo no encontrado' });

    await pool.query(`UPDATE honeypots SET status = 'deploying' WHERE id = $1`, [id]);

    const containerId = await deployHoneypot({
      image: honeypot.docker_image,
      honeypotId: honeypot.id,
      apiToken: honeypot.api_token,
    });

    await pool.query(
      `UPDATE honeypots SET status = 'running', container_id = $1, deployed_at = NOW() WHERE id = $2`,
      [containerId, id]
    );
    await invalidateHoneypotListCache();

    logger.info('Señuelo desplegado', { honeypotId: id, containerId });
    res.json({ ok: true, containerId });
  } catch (err) {
    await pool.query(`UPDATE honeypots SET status = 'error' WHERE id = $1`, [id]);
    await invalidateHoneypotListCache();
    logger.error('Error desplegando señuelo', { error: err.message, honeypotId: id });
    res.status(500).json({ error: 'Error al desplegar señuelo. ¿Está el daemon de Docker corriendo?' });
  }
});

// POST /api/honeypots/:id/stop - apaga y elimina el contenedor
router.post('/:id/stop', authenticate, requireRole('superadmin', 'operator'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT container_id FROM honeypots WHERE id = $1', [id]);
    const honeypot = result.rows[0];
    if (!honeypot?.container_id) return res.status(400).json({ error: 'Señuelo no está corriendo' });

    await stopHoneypot(honeypot.container_id);
    await pool.query(
      `UPDATE honeypots SET status = 'stopped', container_id = NULL, stopped_at = NOW() WHERE id = $1`,
      [id]
    );
    await invalidateHoneypotListCache();
    res.json({ ok: true });
  } catch (err) {
    logger.error('Error deteniendo señuelo', { error: err.message, honeypotId: id });
    res.status(500).json({ error: 'Error al detener señuelo' });
  }
});

module.exports = router;
