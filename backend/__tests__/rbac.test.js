jest.mock('../config/postgres', () => ({
  query: jest.fn(),
}));

const { requireRole } = require('../middleware/auth');
const pool = require('../config/postgres');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireRole middleware (RBAC)', () => {
  test('rechaza si no hay admin en el request', async () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();
    await requireRole('superadmin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechaza con 403 si el rol no está permitido', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, role: 'operator' }] });
    const req = { admin: { id: 1, role: 'operator' } };
    const res = mockRes();
    const next = jest.fn();
    await requireRole('superadmin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('permite pasar si el rol está en la lista permitida', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, role: 'superadmin' }] });
    const req = { admin: { id: 1, role: 'operator' } };
    const res = mockRes();
    const next = jest.fn();
    await requireRole('superadmin', 'operator')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.admin.role).toBe('superadmin');
  });

  test('permite a un admin promovido aunque el token viejo diga operator', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, role: 'superadmin' }] });
    const req = { admin: { id: 1, role: 'operator' } };
    const res = mockRes();
    const next = jest.fn();
    await requireRole('superadmin')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.admin.role).toBe('superadmin');
  });
});
