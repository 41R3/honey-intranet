const Docker = require('dockerode');

// Se conecta al socket de Docker del host (montado en docker-compose).
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

function shouldIgnoreDockerError(err) {
  if (!err) return false;
  return (
    err.statusCode === 404 ||
    err.statusCode === 409 ||
    err.statusCode === 304 ||
    /already (in progress|stopped)|not found|removal of container/i.test(err.message || '')
  );
}

// Despliega un contenedor señuelo a partir de una imagen, inyectándole
// el token de API con el que reportará telemetría al backend.
async function deployHoneypot({ image, honeypotId, apiToken }) {
  const container = await docker.createContainer({
    Image: image,
    name: `honeypot-${honeypotId}-${Date.now()}`,
    Env: [
      `HONEYPOT_ID=${honeypotId}`,
      `API_TOKEN=${apiToken}`,
      `BACKEND_URL=${process.env.INTERNAL_BACKEND_URL || 'http://backend:4000'}`,
    ],
    HostConfig: {
      NetworkMode: process.env.DOCKER_NETWORK || 'honey-intranet_default',
      RestartPolicy: { Name: 'unless-stopped' },
    },
  });

  await container.start();
  return container.id;
}

async function stopHoneypot(containerId) {
  const container = docker.getContainer(containerId);
  try {
    await container.stop();
  } catch (err) {
    if (!shouldIgnoreDockerError(err)) throw err;
  }

  try {
    await container.remove({ force: true });
  } catch (err) {
    if (!shouldIgnoreDockerError(err)) throw err;
  }
}

async function getContainerStatus(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info.State.Status; // running, exited, etc.
  } catch (err) {
    return 'not_found';
  }
}

module.exports = { deployHoneypot, stopHoneypot, getContainerStatus, shouldIgnoreDockerError };
