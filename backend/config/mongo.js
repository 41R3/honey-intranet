const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URL || 'mongodb://mongo:27017');
let db;

// Mongo guarda la telemetría cruda: cada intento de ataque tiene forma distinta
// (headers variables, payloads de inyección impredecibles), por eso NoSQL
// encaja mejor aquí que forzar un esquema relacional rígido.
async function connectMongo() {
  if (db) return db;
  await client.connect();
  db = client.db('honeyintranet');
  console.log('MongoDB conectado');
  return db;
}

function getDb() {
  if (!db) throw new Error('Mongo no conectado todavía');
  return db;
}

module.exports = { connectMongo, getDb };
