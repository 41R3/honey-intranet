const { createClient } = require('redis');
const logger = require('../utils/logger');

const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });

client.on('error', (err) => logger.error('Error de Redis', { error: err.message }));

let connected = false;

async function connectRedis() {
  if (connected) return client;
  await client.connect();
  connected = true;
  logger.info('Redis conectado');
  return client;
}

module.exports = { client, connectRedis };
