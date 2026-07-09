-- Honey-Intranet Orchestrator - Postgres: datos de CONTROL (no telemetría)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    google_id VARCHAR(255) UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'operator'
        CHECK (role IN ('superadmin', 'operator')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS honeypot_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    docker_image VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS honeypots (
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
);

CREATE INDEX IF NOT EXISTS idx_honeypots_status ON honeypots(status);

INSERT INTO honeypot_templates (name, description, docker_image)
SELECT 'fake-intranet-login', 'Página de login falsa de intranet corporativa', 'honeypot-template:latest'
WHERE NOT EXISTS (
  SELECT 1 FROM honeypot_templates WHERE name = 'fake-intranet-login'
);
