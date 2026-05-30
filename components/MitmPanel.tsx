'use client';

import React, { useState } from 'react';
import { Device } from './DeviceTable';

interface MitmPanelProps {
  targetDevice?: Device | null;
  gatewayDevice?: Device | null;
  activeSession?: any;
  onStart: (targetIp: string, gatewayIp: string) => Promise<void>;
  onStop: (sessionId: string) => Promise<void>;
}

/**
 * MitmPanel Component
 * Provides controls for starting and stopping MITM simulations.
 * Displays real-time session statistics when active.
 */
export default function MitmPanel({ targetDevice, gatewayDevice, activeSession, onStart, onStop }: MitmPanelProps) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!targetDevice || !gatewayDevice) return;
    
    // Safety confirmation
    if (!confirm('🚨 EDUCATIONAL PURPOSE ONLY: Are you sure you want to start a MITM simulation on this network? Ensure you have explicit authorization and are in an isolated lab environment.')) {
      return;
    }
    
    setLoading(true);
    try {
      await onStart(targetDevice.ip_address, gatewayDevice.ip_address);
    } catch (error) {
      alert(`Failed to start MITM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      await onStop(activeSession.session_id);
    } catch (error) {
      alert(`Failed to stop MITM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-card">
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ 
          background: 'var(--accent)', 
          color: 'white', 
          width: '24px', 
          height: '24px', 
          borderRadius: '4px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '14px'
        }}>⚡</span>
        MITM Interception Control
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>TARGET DEVICE</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: targetDevice ? 'var(--text)' : 'var(--text-dim)' }}>
            {targetDevice ? targetDevice.ip_address : '---.---.---.---'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {targetDevice ? targetDevice.mac_address : 'Select a device'}
          </div>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>NETWORK GATEWAY</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: gatewayDevice ? 'var(--text)' : 'var(--text-dim)' }}>
            {gatewayDevice ? gatewayDevice.ip_address : '---.---.---.---'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {gatewayDevice ? gatewayDevice.mac_address : 'Auto-detected'}
          </div>
        </div>
      </div>

      {activeSession ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="status-badge status-active" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="animate-pulse" style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%' }}></span>
            SIMULATION ACTIVE
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(14, 165, 233, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
             <div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>Packets Captured</div>
               <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                 {activeSession.packets_captured?.toLocaleString() || 0}
               </div>
             </div>
             <div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>Total Bandwidth</div>
               <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                 {(activeSession.total_bandwidth / 1024).toFixed(1)} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>KB</span>
               </div>
             </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px dashed var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
            {targetDevice 
              ? 'Target identification complete. Click below to begin ARP poisoning and traffic interception. All data will be logged for educational analysis.' 
              : 'Protocol: Please select a discovered client device from the network table above to prepare for interception simulation.'}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        {!activeSession ? (
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '0.75rem' }}
            disabled={!targetDevice || !gatewayDevice || loading}
            onClick={handleStart}
          >
            {loading ? 'Initializing Interface...' : 'Begin MITM Interception'}
          </button>
        ) : (
          <button 
            className="btn btn-accent" 
            style={{ flex: 1, padding: '0.75rem' }}
            disabled={loading}
            onClick={handleStop}
          >
            {loading ? 'Restoring ARP Tables...' : 'Cease Simulation & Restore'}
          </button>
        )}
      </div>
      
      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <p style={{ fontSize: '0.65rem', color: '#fca5a5', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          <strong>Legal Disclaimer:</strong> This system is for pedagogical research only. Improper use in non-lab environments may violate network policies and local laws.
        </p>
      </div>
    </div>
  );
}
