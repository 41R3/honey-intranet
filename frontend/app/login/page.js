'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      window.sessionStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">🍯 Honey-Intranet</h1>
        <label htmlFor="email" className="block mb-1 text-sm">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          required
        />
        <label htmlFor="password" className="block mb-1 text-sm">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          required
        />
        {error && <p role="alert" aria-live="assertive" className="text-red-400 text-sm mb-4">{error}</p>}
        <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 py-2 rounded font-semibold">
          Entrar
        </button>
        <p className="text-xs text-slate-400 mt-4">
          ¿No tienes cuenta? Regístrate vía POST /auth/register
        </p>
      </form>
    </main>
  );
}
