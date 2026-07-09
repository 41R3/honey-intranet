const { Pool } = require('pg');
const logger = require('../utils/logger');

function buildPool(connectionString) {
  return new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

function getConnectionCandidates() {
  const primary = process.env.DATABASE_URL;
  if (!primary) {
    throw new Error('DATABASE_URL no está configurada');
  }

  const candidates = [primary];
  try {
    const url = new URL(primary);
    if (url.hostname === 'db') {
      url.hostname = 'localhost';
      candidates.push(url.toString());
    }
  } catch (err) {
    logger.warn('DATABASE_URL inválida, no se pudo preparar fallback', { error: err.message });
  }

  return candidates;
}

let activePool = buildPool(getConnectionCandidates()[0]);
let activeConnectionString = getConnectionCandidates()[0];

const pool = {
  query: (...args) => activePool.query(...args),
  end: (...args) => activePool.end(...args),
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    google_id VARCHAR(255) UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'operator'
      CHECK (role IN ('superadmin', 'operator')),
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash TEXT`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(20)`,
  `ALTER TABLE admins ALTER COLUMN role SET DEFAULT 'operator'`,
  `UPDATE admins SET role = 'operator' WHERE role IS NULL`,
  `UPDATE admins
   SET role = 'superadmin'
   WHERE id = (
     SELECT id FROM admins ORDER BY created_at ASC, id ASC LIMIT 1
   )
   AND NOT EXISTS (
     SELECT 1 FROM admins WHERE role = 'superadmin'
   )`,
  `ALTER TABLE admins ALTER COLUMN role SET NOT NULL`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'admins_role_check'
     ) THEN
       ALTER TABLE admins
         ADD CONSTRAINT admins_role_check CHECK (role IN ('superadmin', 'operator'));
     END IF;
   END $$`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
  `CREATE TABLE IF NOT EXISTS honeypot_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    docker_image VARCHAR(255) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS honeypots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    template_id INTEGER REFERENCES honeypot_templates(id),
    status VARCHAR(20) NOT NULL DEFAULT 'stopped'
      CHECK (status IN ('stopped', 'deploying', 'running', 'error')),
    container_id VARCHAR(100),
    api_token TEXT NOT NULL,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT NOW(),
    deployed_at TIMESTAMP,
    stopped_at TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_honeypots_status ON honeypots(status)`,
  `INSERT INTO honeypot_templates (name, description, docker_image)
   SELECT 'fake-intranet-login', 'Página de login falsa de intranet corporativa', 'honeypot-template:latest'
   WHERE NOT EXISTS (
     SELECT 1 FROM honeypot_templates WHERE name = 'fake-intranet-login'
   )`,
];

let initializationPromise;

async function ensureSchema() {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }
}

async function initializePostgres() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const maxAttempts = 10;
      const delayMs = 2000;
      let lastError;

      for (const connectionString of getConnectionCandidates()) {
        if (connectionString !== activeConnectionString) {
          activePool = buildPool(connectionString);
          activeConnectionString = connectionString;
        }

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            await pool.query('SELECT 1');
            await ensureSchema();
            return pool;
          } catch (err) {
            lastError = err;
            logger.warn('Postgres no está listo todavía', {
              attempt,
              maxAttempts,
              connectionString,
              error: err.message,
            });
            const canRetryPrimary =
              attempt < maxAttempts &&
              !(err.code === 'ENOTFOUND' && connectionString !== getConnectionCandidates()[0]);
            if (canRetryPrimary) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            } else {
              break;
            }
          }
        }
      }

      if (lastError) {
        throw lastError;
      }
    })();
  }

  return initializationPromise;
}

module.exports = pool;
module.exports.initializePostgres = initializePostgres;
