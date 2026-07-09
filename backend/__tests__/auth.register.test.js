jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('../config/postgres', () => ({
  query: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const pool = require('../config/postgres');
const authRoutes = require('../routes/auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  return app;
}

describe('auth register route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('crea el primer admin como superadmin', async () => {
    bcrypt.hash.mockResolvedValue('hashed-password');
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'admin@test.com', role: 'superadmin' }] });

    const app = buildApp();
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'admin@test.com', password: 'tuclave123' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      admin: { id: 1, email: 'admin@test.com', role: 'superadmin' },
    });
    expect(pool.query).toHaveBeenNthCalledWith(1, 'SELECT COUNT(*)::int AS count FROM admins');
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO admins (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      ['admin@test.com', 'hashed-password', 'superadmin']
    );
  });
});
