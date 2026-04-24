'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

export function AnalyticsAuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/analytics');
      const data = await res.json();
      setStatus(data.authenticated ? 'authenticated' : 'unauthenticated');
    } catch {
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('authenticated');
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f2f0ed]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2f0ed] p-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
            <Lock className="h-5 w-5 text-stone-600" strokeWidth={1.75} />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">Analytics Access</h2>
            <p className="mt-1 text-sm text-gray-500">Enter your credentials to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="analytics-username" className="mb-1 block text-xs font-medium text-gray-700">
              Username
            </label>
            <input
              id="analytics-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
              placeholder="Username"
            />
          </div>

          <div>
            <label htmlFor="analytics-password" className="mb-1 block text-xs font-medium text-gray-700">
              Password
            </label>
            <input
              id="analytics-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
              placeholder="Password"
            />
          </div>

          {error && (
            <p className="text-center text-xs font-medium text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-stone-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
