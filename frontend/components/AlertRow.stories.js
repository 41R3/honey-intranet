import AlertRow from './AlertRow';

export default {
  title: 'Dashboard/AlertRow',
  component: AlertRow,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <ul className="bg-slate-800 rounded-lg p-4"><Story /></ul>],
};

export const ConCredenciales = {
  args: {
    alert: {
      ip: '172.19.0.9',
      userAgent: 'curl/8.17.0',
      capturedAt: new Date().toISOString(),
      attemptedCredentials: { username: 'admin', password: '1234' },
    },
  },
};

export const SinCredenciales = {
  args: {
    alert: {
      ip: '172.19.0.14',
      userAgent: 'Mozilla/5.0 (compatible; scanner-bot)',
      capturedAt: new Date().toISOString(),
    },
  },
};

export const IpDesconocida = {
  args: {
    alert: {
      ip: null,
      userAgent: 'curl/8.17.0',
      capturedAt: new Date().toISOString(),
      attemptedCredentials: { username: 'root', password: 'toor' },
    },
  },
};
