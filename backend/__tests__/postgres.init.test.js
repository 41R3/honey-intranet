const mockQuery = jest.fn();

process.env.DATABASE_URL = 'postgresql://postgres:postgres@db:5432/honeyintranet';

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { initializePostgres } = require('../config/postgres');

describe('initializePostgres', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('crea el schema base de forma idempotente', async () => {
    mockQuery.mockResolvedValue({});

    await initializePostgres();

    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ALTER TABLE admins ADD COLUMN IF NOT EXISTS role'));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE admins SET role ='));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SET role = 'superadmin'"));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS admins'));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS honeypot_templates'));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS honeypots'));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_honeypots_status'));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO honeypot_templates'));
  });
});
