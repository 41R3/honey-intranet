const jwt = require('jsonwebtoken');
const pool = require('../config/postgres');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  try {
    req.admin = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// RBAC simple de 2 roles: 'superadmin' (gestiona infraestructura: crea señuelos,
// crea otros admins) y 'operator' (opera señuelos ya existentes: despliega/detiene).
// Uso: router.post('/', authenticate, requireRole('superadmin'), handler)
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'Token no proporcionado' });
    try {
      const result = await pool.query('SELECT id, role FROM admins WHERE id = $1 LIMIT 1', [req.admin.id]);
      const currentAdmin = result.rows[0];
      if (!currentAdmin) {
        return res.status(401).json({ error: 'Token no proporcionado' });
      }

      req.admin.role = currentAdmin.role;
      if (!allowedRoles.includes(currentAdmin.role)) {
        return res.status(403).json({ error: 'No tenés permisos para esta acción' });
      }
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
}

// Verifica el token propio del contenedor señuelo (no es un admin, es el honeypot reportando)
async function authenticateHoneypot(req, res, next) {
  const token = req.headers['x-honeypot-token'];
  if (!token) return res.status(401).json({ error: 'Token de señuelo faltante' });
  req.honeypotToken = token;
  next();
}

module.exports = { authenticate, authenticateHoneypot, requireRole };
