'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken } from '../../lib/api';
import HoneypotCard from '../../components/HoneypotCard';
import AlertRow from '../../components/AlertRow';

export default function Dashboard() {
  const [honeypots, setHoneypots] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [hp, al] = await Promise.all([
        apiFetch('/api/honeypots'),
        apiFetch('/api/telemetry'),
      ]);
      setHoneypots(hp);
      setAlerts(al);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    apiFetch('/api/honeypots/templates').then(setTemplates).catch(() => {});
    loadData();
    // Polling cada 5s para simular alertas "en tiempo real"
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData, router]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName || !templates[0]) return;
    try {
      await apiFetch('/api/honeypots', {
        method: 'POST',
        body: JSON.stringify({ name: newName, templateId: templates[0].id }),
      });
      setNewName('');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeploy(id) {
    try {
      await apiFetch(`/api/honeypots/${id}/deploy`, { method: 'POST' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStop(id) {
    try {
      await apiFetch(`/api/honeypots/${id}/stop`, { method: 'POST' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-sky-600 text-white px-3 py-2 rounded z-50">
        Saltar al contenido principal
      </a>
      <h1 className="text-2xl font-bold mb-6">🍯 Honey-Intranet Orchestrator</h1>
      {error && <p role="alert" aria-live="assertive" className="text-red-400 mb-4">{error}</p>}

      <div id="main-content">
      <section className="mb-8" aria-labelledby="honeypots-heading">
        <h2 id="honeypots-heading" className="text-lg font-semibold mb-3">Señuelos</h2>
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <label htmlFor="hp-name" className="sr-only">Nombre del señuelo</label>
          <input
            id="hp-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del señuelo (ej: intranet-rrhh)"
            className="flex-1 p-2 rounded bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button type="submit" className="bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded">
            Crear
          </button>
        </form>
        <div className="space-y-2">
          {honeypots.map((h) => (
            <HoneypotCard key={h.id} honeypot={h} onDeploy={handleDeploy} onStop={handleStop} />
          ))}
          {honeypots.length === 0 && <p className="text-slate-400">Aún no hay señuelos creados.</p>}
        </div>
      </section>

      <section aria-labelledby="alerts-heading">
        <h2 id="alerts-heading" className="text-lg font-semibold mb-3">Alertas capturadas</h2>
        <ul aria-live="polite" className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
          {alerts.map((a) => (
            <AlertRow key={a._id} alert={a} />
          ))}
          {alerts.length === 0 && <li className="text-slate-400 list-none">Sin capturas todavía.</li>}
        </ul>
      </section>
      </div>
    </main>
  );
}
