const { buildSchema } = require('graphql');
const pool = require('../config/postgres');
const { getDb } = require('../config/mongo');

// GraphQL acá es deliberadamente de solo lectura: las mutaciones (crear,
// desplegar, detener un señuelo) tocan Docker y estado sensible, así que
// se quedan en REST donde el control de errores HTTP es más explícito.
// GraphQL cubre las consultas de "dame exactamente estos campos, combinando
// estas 2 fuentes" que en REST te obligarían a pegarle a 2-3 endpoints.
const schema = buildSchema(`
  type Honeypot {
    id: ID!
    name: String!
    status: String!
    templateName: String
    deployedAt: String
  }

  type Alert {
    honeypotId: String
    ip: String
    userAgent: String
    capturedAt: String
  }

  type Query {
    honeypots: [Honeypot!]!
    alerts(limit: Int): [Alert!]!
  }
`);

const root = {
  honeypots: async () => {
    const result = await pool.query(
      `SELECT h.id, h.name, h.status, h.deployed_at, t.name AS template_name
       FROM honeypots h
       JOIN honeypot_templates t ON t.id = h.template_id
       ORDER BY h.created_at DESC`
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      templateName: row.template_name,
      deployedAt: row.deployed_at ? row.deployed_at.toISOString() : null,
    }));
  },

  alerts: async ({ limit }) => {
    const db = getDb();
    const alerts = await db
      .collection('telemetry')
      .find({})
      .sort({ capturedAt: -1 })
      .limit(limit && limit > 0 ? limit : 50)
      .toArray();
    return alerts.map((a) => ({
      honeypotId: a.honeypotId,
      ip: a.ip,
      userAgent: a.userAgent,
      capturedAt: a.capturedAt ? new Date(a.capturedAt).toISOString() : null,
    }));
  },
};

module.exports = { schema, root };
