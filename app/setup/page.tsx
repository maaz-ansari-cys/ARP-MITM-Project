'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Success! Middleware will handle the redirect based on the cookie set in API
        router.push('/dashboard');
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch (err) {
      setError('Failed to connect to security service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ 
      minHeight: '100vh', 
      background: 'var(--background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="premium-card" style={{ maxWidth: '450px', width: '100%' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Initial Security Setup</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Create the primary administrator account. This account will have full control over network monitoring and MITM simulations.
        </p>

        <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Administrator Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'white',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Master Password</label>
            <input 
              type="password" 
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'white',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'white',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '0.75rem', background: 'rgba(239, 44, 44, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 44, 44, 0.2)' }}>
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '0.85rem' }}
            disabled={loading}
          >
            {loading ? 'Initializing...' : 'Initialize System Administrator'}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          This setup is only required once. Ensure you store these credentials securely as they cannot be reset without internal database access.
        </div>
      </div>
    </main>
  );
}
