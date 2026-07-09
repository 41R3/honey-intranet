const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/postgres');
const logger = require('../utils/logger');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

// POST /auth/register — el PRIMER admin registrado en todo el sistema se
// convierte automáticamente en 'superadmin' (bootstrap). Todos los que se
// registren después entran como 'operator'; solo un superadmin puede
// ascender a alguien vía PATCH /auth/admins/:id/role (ver abajo).
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS count FROM admins');
    const role = countRows[0].count === 0 ? 'superadmin' : 'operator';

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO admins (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hash, role]
    );
    res.status(201).json({ admin: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email ya registrado' });
    logger.error('Error registrando admin', { error: err.message });
    res.status(500).json({ error: 'Error al registrar' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];
    // admin.password_hash puede ser NULL si la cuenta se creó vía Google OAuth2
    if (!admin || !admin.password_hash || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    res.json({ token: signToken(admin) });
  } catch (err) {
    logger.error('Error en login', { error: err.message });
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// POST /auth/google — login/registro vía OAuth2 de Google. El frontend usa
// Google Identity Services (GSI) para obtener un id_token del lado del
// cliente y lo manda acá; el backend lo verifica contra Google antes de
// confiar en él (nunca confiamos en un email que no verificamos nosotros).
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Falta idToken' });
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'OAuth2 con Google no está configurado en este servidor' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;

    let result = await pool.query('SELECT * FROM admins WHERE google_id = $1 OR email = $2', [googleId, email]);
    let admin = result.rows[0];

    if (!admin) {
      const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS count FROM admins');
      const role = countRows[0].count === 0 ? 'superadmin' : 'operator';
      const insert = await pool.query(
        'INSERT INTO admins (email, google_id, role) VALUES ($1, $2, $3) RETURNING *',
        [email, googleId, role]
      );
      admin = insert.rows[0];
    } else if (!admin.google_id) {
      // Cuenta existente con password que ahora también vincula Google
      await pool.query('UPDATE admins SET google_id = $1 WHERE id = $2', [googleId, admin.id]);
    }

    res.json({ token: signToken(admin) });
  } catch (err) {
    logger.error('Error en login con Google', { error: err.message });
    res.status(401).json({ error: 'Token de Google inválido' });
  }
});

module.exports = router;
