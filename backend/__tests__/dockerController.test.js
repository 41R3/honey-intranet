const mockStop = jest.fn();
const mockRemove = jest.fn();
const mockGetContainer = jest.fn(() => ({
  stop: mockStop,
  remove: mockRemove,
}));

jest.mock('dockerode', () =>
  jest.fn(() => ({
    getContainer: mockGetContainer,
  }))
);

const { stopHoneypot, shouldIgnoreDockerError } = require('../config/dockerController');

describe('dockerController', () => {
  beforeEach(() => {
    mockStop.mockReset();
    mockRemove.mockReset();
    mockGetContainer.mockClear();
  });

  test('ignora errores de Docker ya resuelto o en progreso', async () => {
    expect(shouldIgnoreDockerError({ statusCode: 409, message: 'removal of container is already in progress' })).toBe(true);
    expect(shouldIgnoreDockerError({ statusCode: 404, message: 'not found' })).toBe(true);
    expect(shouldIgnoreDockerError({ statusCode: 500, message: 'boom' })).toBe(false);
  });

  test('stopHoneypot no falla si el contenedor ya se estaba eliminando', async () => {
    mockStop.mockRejectedValue({ statusCode: 409, message: 'removal of container is already in progress' });
    mockRemove.mockRejectedValue({ statusCode: 409, message: 'removal of container is already in progress' });

    await expect(stopHoneypot('abc')).resolves.toBeUndefined();
    expect(mockGetContainer).toHaveBeenCalledWith('abc');
    expect(mockStop).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith({ force: true });
  });
});
