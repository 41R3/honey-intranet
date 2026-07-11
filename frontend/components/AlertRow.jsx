export default function AlertRow({ alert }) {
  const time = new Date(alert.capturedAt).toLocaleString();
  return (
    <li className="border-b border-slate-700 py-3">
      <div className="flex justify-between text-sm">
        <span className="font-mono text-red-400">{alert.ip || 'IP desconocida'}</span>
        <span className="text-slate-400">{time}</span>
      </div>
      {alert.attemptedCredentials && (
        <p className="text-sm mt-1">
          Intentó: <span className="font-mono">{alert.attemptedCredentials.username}</span> /{' '}
          <span className="font-mono">{alert.attemptedCredentials.password}</span>
        </p>
      )}
      <p className="text-xs text-slate-500 truncate">{alert.userAgent}</p>
    </li>
  );
}
