process.env.JWT_SECRET = 'test_secret';
const jwt = require('jsonwebtoken');
jest.mock('../config/postgres', () => ({
  query: jest.fn(),
}));
const { authenticate } = require('../middleware/auth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware', () => {
  test('rechaza sin token', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('acepta token válido de admin', () => {
    const token = jwt.sign({ id: 1, email: 'a@a.com' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.admin.email).toBe('a@a.com');
  });
});
