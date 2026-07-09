export default function HoneypotCard({ honeypot, onDeploy, onStop }) {
  const statusColors = {
    running: 'bg-green-600',
    deploying: 'bg-yellow-500',
    stopped: 'bg-slate-500',
    error: 'bg-red-600',
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="font-semibold">{honeypot.name}</p>
        <p className="text-sm text-slate-400">{honeypot.template_name}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          role="status"
          className={`text-xs px-2 py-1 rounded-full text-white ${statusColors[honeypot.status]}`}
        >
          {honeypot.status}
        </span>
        {honeypot.status === 'running' ? (
          <button
            onClick={() => onStop(honeypot.id)}
            aria-label={`Detener señuelo ${honeypot.name}`}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
          >
            Detener
          </button>
        ) : (
          <button
            onClick={() => onDeploy(honeypot.id)}
            disabled={honeypot.status === 'deploying'}
            aria-label={`Desplegar señuelo ${honeypot.name}`}
            className="bg-sky-600 hover:bg-sky-700 px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Desplegar
          </button>
        )}
      </div>
    </div>
  );
}
