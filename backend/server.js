require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { graphqlHTTP } = require('express-graphql');

const authRoutes = require('./routes/auth');
const honeypotRoutes = require('./routes/honeypots');
const telemetryRoutes = require('./routes/telemetry');
const { authenticate } = require('./middleware/auth');
const { schema, root } = require('./graphql');
const { connectMongo } = require('./config/mongo');
const { connectRedis } = require('./config/redis');
const { initializePostgres } = require('./config/postgres');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/api/honeypots', honeypotRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use(
  '/graphql',
  authenticate,
  graphqlHTTP({ schema, rootValue: root, graphiql: process.env.NODE_ENV !== 'production' })
);

app.use((err, req, res, next) => {
  logger.error('Error no manejado', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await initializePostgres();
  } catch (err) {
    logger.error('Error inicializando Postgres', { error: err.message });
    process.exit(1);
  }

  try {
    await connectMongo();
  } catch (err) {
    logger.error('Error conectando Mongo', { error: err.message });
  }
  try {
    await connectRedis();
  } catch (err) {
    logger.error('Error conectando Redis', { error: err.message });
  }
  app.listen(PORT, () => logger.info(`Honey-Intranet backend en puerto ${PORT}`));
}

start();
