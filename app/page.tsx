'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Premium Landing Page
 * Provides the first impression of the Network Visibility tool.
 * Detects system initialization and directs users to setup or login.
 */
export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Check if the system has an admin user already
    async function checkInit() {
      try {
        const res = await fetch('/api/auth/check-initialized');
        const data = await res.json();
        setInitialized(data.initialized);
      } catch (err) {
        console.error('Initialization check failed', err);
      } finally {
        setLoading(false);
      }
    }
    checkInit();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#0f172a' 
      }}>
        <div className="animate-spin" style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid var(--border)', 
          borderTopColor: 'var(--primary)', 
          borderRadius: '50%' 
        }} />
      </div>
    );
  }

  return (
    <main style={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Elements */}
      <div style={{ 
        position: 'absolute', 
        top: '10%', 
        left: '10%', 
        width: '30vw', 
        height: '30vw', 
        background: 'rgba(14, 165, 233, 0.05)', 
        filter: 'blur(100px)', 
        borderRadius: '50%',
        zIndex: 0 
      }} />
      <div style={{ 
        position: 'absolute', 
        bottom: '10%', 
        right: '10%', 
        width: '40vw', 
        height: '40vw', 
        background: 'rgba(99, 102, 241, 0.05)', 
        filter: 'blur(120px)', 
        borderRadius: '50%',
        zIndex: 0 
      }} />

      <div className="premium-card" style={{ 
        maxWidth: '500px', 
        width: '100%', 
        textAlign: 'center', 
        backdropFilter: 'blur(10px)',
        background: 'rgba(30, 41, 59, 0.7)',
        zIndex: 1,
        padding: '3rem 2rem'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          margin: '0 auto 2rem', 
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          boxShadow: '0 0 40px rgba(14, 165, 233, 0.3)'
        }}>
          🛡️
        </div>

        <h1 style={{ 
          fontSize: '2.25rem', 
          fontWeight: 900, 
          marginBottom: '1rem',
          letterSpacing: '-0.04em'
        }}>
          Network <span style={{ color: 'var(--primary)' }}>Visibility</span>
        </h1>
        
        <p style={{ 
          color: 'var(--text-dim)', 
          marginBottom: '2.5rem', 
          lineHeight: 1.6,
          fontSize: '1.1rem'
        }}>
          Secure, authenticated portal for network analysis and interception research.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {initialized ? (
            <>
              <button 
                className="btn btn-primary" 
                style={{ padding: '1rem', fontSize: '1rem' }}
                onClick={() => router.push('/login')}
              >
                Access Command Center
              </button>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
                Administrator credentials required
              </div>
            </>
          ) : (
            <>
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(245, 158, 11, 0.1)', 
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '8px',
                color: 'var(--warning)',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                textAlign: 'left'
              }}>
                <strong>System Uninitialized:</strong> No admin user detected. Please perform the one-time security setup to begin.
              </div>
              <button 
                className="btn btn-primary" 
                style={{ padding: '1rem', fontSize: '1rem' }}
                onClick={() => router.push('/setup')}
              >
                Initialize Security Setup
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ 
        marginTop: '3rem', 
        fontSize: '0.75rem', 
        color: 'var(--text-dim)', 
        maxWidth: '400px', 
        textAlign: 'center',
        opacity: 0.6
      }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: 700, color: 'var(--accent)' }}>
          ⚠️ EDUCATIONAL LAB USE ONLY
        </p>
        <p>
          Unauthorized interception is strictly prohibited. Use only in controlled, private lab environments with proper authorization.
        </p>
      </div>
    </main>
  );
}
