'use client';

import React, { useState, useEffect } from 'react';

/**
 * Traffic entry type
 */
export interface TrafficEntry {
  _id: string;
  timestamp: string;
  bytes_sent: number;
  bytes_received: number;
  packets_count: number;
  protocols: Record<string, number>;
  top_destinations?: Array<{ ip: string; count: number }>;
}

interface TrafficLogProps {
  logs: TrafficEntry[];
  totalBandwidth: number;
}

/**
 * TrafficLog Component
 * Displays a historical log of captured traffic and protocol breakdown.
 */
export default function TrafficLog({ logs, totalBandwidth }: TrafficLogProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when logs change (e.g. new device selected)
  useEffect(() => {
    setSelectedIndex(0);
  }, [logs.length > 0 ? logs[0]._id : '']);

  // Aggregate protocols from all logs (keeping this global for the device summary)
  const protocolBreakdown = logs.reduce((acc, log) => {
    Object.entries(log.protocols || {}).forEach(([proto, count]) => {
      acc[proto] = (acc[proto] || 0) + count;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedProtocols = Object.entries(protocolBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const selectedLog = logs[selectedIndex] || null;

  return (
    <div className="premium-card">
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ 
          background: 'var(--secondary)', 
          color: 'white', 
          width: '24px', 
          height: '24px', 
          borderRadius: '4px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '14px'
        }}>📊</span>
        Traffic Analysis History
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <div className="table-container" style={{ maxHeight: '300px' }}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Packets</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr 
                    key={log._id} 
                    onClick={() => setSelectedIndex(index)}
                    style={{ 
                      cursor: 'pointer',
                      background: selectedIndex === index ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                      borderLeft: selectedIndex === index ? '2px solid var(--primary)' : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    className={selectedIndex === index ? 'active-row' : ''}
                  >
                    <td style={{ fontSize: '0.8rem', fontWeight: selectedIndex === index ? 700 : 400 }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td>{log.packets_count}</td>
                    <td>{((log.bytes_sent + log.bytes_received) / 1024).toFixed(2)} KB</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                      No traffic intercepted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            💡 Hint: Click a session above to view detailed host resolution below.
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            Device Protocol Mix
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sortedProtocols.map(([proto, count]) => (
              <div key={proto}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>{proto}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.min(100, (count / logs.reduce((s, l) => s + l.packets_count, 0)) * 100 || 0)}%`, 
                      height: '100%', 
                      background: 'var(--primary)' 
                    }} 
                  />
                </div>
              </div>
            ))}
            {sortedProtocols.length === 0 && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Waiting for protocol data...
              </div>
            )}
          </div>
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Lifetime Bandwidth</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)' }}>
              {(totalBandwidth / (1024 * 1024)).toFixed(2)} <span style={{ fontSize: '0.75rem' }}>MB</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🌐</span> Targeted Host & DNS Resolution
          </h4>
          {selectedLog && (
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(14, 165, 233, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
              Viewing Session: {new Date(selectedLog.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="table-container">
          <table style={{ background: 'rgba(255,255,255,0.01)' }}>
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Resolved Host / External IP</th>
                <th style={{ textAlign: 'center' }}>Packets</th>
                <th>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {selectedLog && selectedLog.top_destinations && selectedLog.top_destinations.length > 0 ? (
                selectedLog.top_destinations.map((dest, i) => {
                  const destinations = selectedLog.top_destinations || [];
                  const maxPkts = Math.max(...destinations.map(d => d.count || 0), 1);
                  const percentage = ((dest.count || 0) / maxPkts) * 100;
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{dest.ip}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {dest.count?.toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ flexGrow: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', width: '35px' }}>{Math.round(percentage)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                    <div style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>📡</div>
                    {logs.length > 0 
                      ? 'Select a session above to resolve destination data.' 
                      : 'No destination packet resolution data available for this specific capture.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
