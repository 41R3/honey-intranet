import HoneypotCard from './HoneypotCard';

export default {
  title: 'Dashboard/HoneypotCard',
  component: HoneypotCard,
  parameters: { layout: 'padded' },
  argTypes: {
    onDeploy: { action: 'deploy' },
    onStop: { action: 'stop' },
  },
};

const base = {
  id: 1,
  name: 'intranet-rrhh',
  template_name: 'fake-intranet-login',
};

export const Stopped = {
  args: { honeypot: { ...base, status: 'stopped' } },
};

export const Deploying = {
  args: { honeypot: { ...base, status: 'deploying' } },
};

export const Running = {
  args: { honeypot: { ...base, status: 'running' } },
};

export const Error = {
  args: { honeypot: { ...base, status: 'error' } },
};
