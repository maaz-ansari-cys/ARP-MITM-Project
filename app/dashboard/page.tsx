'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DeviceTable, { Device } from '@/components/DeviceTable';
import MitmPanel from '@/components/MitmPanel';
import TrafficLog, { TrafficEntry } from '@/components/TrafficLog';
import ScanButton from '@/components/ScanButton';
import { api } from '@/lib/api-client';

/**
 * Network info returned by the Python service auto-detection.
 */
interface NetworkInfo {
  interface: string | null;
  ip_address: string | null;
  gateway_ip: string | null;
  network_range: string | null;
  ssid: string | null;
  gateway_reachable: boolean;
}

/**
 * Dashboard Page
 * Main command center for the network visibility tool.
 * Orchestrates data fetching, state management, and component interaction.
 */
export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [trafficLogs, setTrafficLogs] = useState<TrafficEntry[]>([]);
  const [totalBandwidth, setTotalBandwidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pythonOnline, setPythonOnline] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [mitmHistory, setMitmHistory] = useState<any[]>([]);

  // Auto-detected network info from the Python service
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  // Fetch network info from Python service
  const refreshNetworkInfo = useCallback(async () => {
    try {
      const data = await api.getNetworkInfo() as NetworkInfo;
      setNetworkInfo(data);
      setPythonOnline(true);
      return data;
    } catch (error) {
      setPythonOnline(false);
      return null;
    }
  }, []);

  // Refresh discovered devices list from MongoDB
  // Filters by current subnet so stale devices from other networks don't appear
  const refreshDevices = useCallback(async () => {
    try {
      const data = await api.getDevices(
        undefined,
        networkInfo?.network_range || undefined
      ) as { devices: Device[] };
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    } finally {
      setLoading(false);
    }
  }, [networkInfo?.network_range]);

  // Trigger an actual ARP scan via Python/Scapy, then refresh the device table
  const handleScan = useCallback(async () => {
    try {
      await api.startScan();
      // Refresh network info (scan may have re-detected the network)
      await refreshNetworkInfo();
      // Re-read from DB to ensure devices have valid MongoDB _id populated
      await refreshDevices();
    } catch (error: any) {
      console.error('Scan failed:', error);
      alert(`Scan failed: ${error.message}\n\nMake sure the Python service is running with admin/root privileges.`);
    }
  }, [refreshDevices, refreshNetworkInfo]);

  // Check if any MITM session is currently active in the service
  const checkSessionStatus = useCallback(async () => {
    try {
      const data = await api.getMitmStatus() as { active_sessions: any[] };
      if (data.active_sessions && data.active_sessions.length > 0) {
        setActiveSession(data.active_sessions[0]);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      // Python service is offline — handled by refreshNetworkInfo
    }
  }, []);

  const refreshMitmHistory = useCallback(async () => {
    try {
      const data = await api.getMitmHistory() as { history: any[] };
      setMitmHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  // Fetch historical traffic logs for the selected device
  const refreshTraffic = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const data = await api.getDeviceTraffic(selectedDevice._id) as { traffic_logs: TrafficEntry[], total_bandwidth: number };
      setTrafficLogs(data.traffic_logs || []);
      setTotalBandwidth(data.total_bandwidth || 0);
    } catch (error) {
      console.error('Failed to refresh traffic:', error);
    }
  }, [selectedDevice]);

  // Initial load and background polling
  useEffect(() => {
    // First fetch network info, then devices
    refreshNetworkInfo().then(() => {
      refreshDevices();
    });
    checkSessionStatus();
    refreshMitmHistory();

    // Poll for device changes and session status
    const interval = setInterval(() => {
      refreshNetworkInfo();
      refreshDevices();
      checkSessionStatus();
      refreshMitmHistory();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshDevices, checkSessionStatus, refreshMitmHistory, refreshNetworkInfo]);

  // Real-time traffic polling when a device is selected or simulation is active
  useEffect(() => {
    if (activeSession || selectedDevice) {
      refreshTraffic();
      const interval = setInterval(refreshTraffic, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSession, selectedDevice, refreshTraffic]);

  const handleStartMitm = async (targetIp: string, gatewayIp: string) => {
    const data = await api.startMitm(targetIp, gatewayIp) as { session_id: string };
    setActiveSession({
      session_id: data.session_id,
      target_ip: targetIp,
      gateway_ip: gatewayIp,
      status: 'active',
      packets_captured: 0,
      total_bandwidth: 0
    });
    
    // Ensure the device stays selected to see the active session UI
    const device = devices.find(d => d.ip_address === targetIp);
    if (device) setSelectedDevice(device);
  };

  const handleStopMitm = async (sessionId: string) => {
    await api.stopMitm(sessionId);
    setActiveSession(null);
    // Final statistics update
    setTimeout(refreshTraffic, 1000);
  };

  // Auto-detect the gateway device for the MITM panel
  const gateway = devices.find(d => d.is_gateway);
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem', minHeight: '100vh' }}>
      <header style={{ marginBottom: '3.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div>
             <div style={{ 
               display: 'inline-block', 
               padding: '0.25rem 0.75rem', 
               background: 'var(--accent)', 
               borderRadius: '4px', 
               fontSize: '0.7rem', 
               fontWeight: 800, 
               marginBottom: '0.75rem',
               letterSpacing: '0.1em'
             }}>
               LAB ENVIRONMENT v1.2
             </div>
             <h1 style={{ 
               fontSize: '3rem', 
               marginBottom: '0.25rem', 
               fontWeight: 900,
               background: 'linear-gradient(135deg, #fff 0%, var(--primary) 100%)', 
               WebkitBackgroundClip: 'text', 
               WebkitTextFillColor: 'transparent',
               letterSpacing: '-0.04em'
             }}>
               Network Visibility
             </h1>
             <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', maxWidth: '500px', lineHeight: 1.5 }}>
               Educational interception analysis and device monitoring console for secure lab research.
             </p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
               <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin Session</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>● System Online</div>
               </div>
               <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                 🛡️
               </div>
            </div>
            <button 
              onClick={handleLogout}
              className="premium-button"
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.75rem', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '6px'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Network info banner — shows auto-detected connection */}
        {networkInfo && (
          <div style={{
            padding: '0.75rem 1.25rem',
            background: 'rgba(14, 165, 233, 0.06)',
            border: '1px solid rgba(14, 165, 233, 0.15)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            marginBottom: '1.5rem',
            fontSize: '0.8rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>📡</span>
              <strong style={{ color: 'var(--primary)' }}>
                {networkInfo.ssid ? networkInfo.ssid : 'Wired'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Subnet: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {networkInfo.network_range || 'Detecting...'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Gateway: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {networkInfo.gateway_ip || '—'}
              </span>
              {networkInfo.gateway_reachable ? (
                <span style={{ color: 'var(--success)', marginLeft: '0.4rem', fontSize: '0.75rem' }}>● Reachable</span>
              ) : networkInfo.gateway_ip ? (
                <span style={{ color: 'var(--warning)', marginLeft: '0.4rem', fontSize: '0.75rem' }}>● Unreachable</span>
              ) : null}
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Host: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {networkInfo.ip_address || '—'}
              </span>
            </div>
          </div>
        )}

        {/* Python service offline banner */}
        {pythonOnline === false && (
          <div style={{
            padding: '0.75rem 1.25rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <div>
              <span style={{ fontWeight: 700, color: 'var(--warning)' }}>Python Network Service Offline</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginLeft: '0.75rem' }}>
                ARP scanning and MITM features require the Python service. Start it with: 
              </span>
              <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--primary)' }}>
                cd python-service &amp;&amp; python main.py
              </code>
            </div>
          </div>
        )}
        {pythonOnline === true && !networkInfo && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Python network service online</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ScanButton
            onScan={handleScan}
            disabled={!pythonOnline}
            onScanningChange={setIsScanning}
          />
          <div style={{ display: 'flex', gap: '2rem' }}>
             <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Interface</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                  {networkInfo?.interface || '—'}
                </div>
             </div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <section className="premium-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
               <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 Discovered Assets
                 {isScanning && (
                   <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, background: 'rgba(14,165,233,0.1)', padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(14,165,233,0.3)' }}>
                     <span className="animate-spin" style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', display: 'inline-block' }}></span>
                     SCANNING
                   </span>
                 )}
               </h2>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <span className="status-badge status-active">
                   {devices.filter(d => d.status === 'active').length} Live
                 </span>
                 <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
                   {devices.length} Total
                 </span>
               </div>
            </div>

            {/* Scanning overlay on table */}
            {isScanning && (
              <div style={{
                position: 'absolute', inset: '57px 0 0 0',
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(3px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, borderRadius: '0 0 12px 12px',
                flexDirection: 'column', gap: '1rem'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Broadcasting ARP requests...</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Scanning {networkInfo?.network_range || 'network'}...
                </div>
              </div>
            )}

            <DeviceTable
              devices={devices}
              onSelectDevice={setSelectedDevice}
              selectedDeviceId={selectedDevice?._id}
            />
          </section>

          <section>
            <TrafficLog logs={trafficLogs} totalBandwidth={totalBandwidth} />
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <MitmPanel 
            targetDevice={selectedDevice} 
            gatewayDevice={gateway} 
            activeSession={activeSession}
            onStart={handleStartMitm}
            onStop={handleStopMitm}
          />

          <div className="premium-card" style={{ borderLeft: '3px solid var(--secondary)', background: 'linear-gradient(to bottom right, var(--surface), rgba(30, 41, 59, 0.5))' }}>
            <h4 style={{ marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent MITM Sessions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
               {mitmHistory.length > 0 ? mitmHistory.map((session, i) => (
                 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{session.target_ip}</span>
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{new Date(session.start_time).toLocaleString()}</span>
                   </div>
                   <div style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: session.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', color: session.status === 'active' ? 'var(--success)' : 'var(--text-dim)' }}>
                      {session.status.toUpperCase()}
                   </div>
                 </div>
               )) : (
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No prior sessions recorded.</div>
               )}
            </div>
            
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--secondary)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
              <strong>Operational Note:</strong> ARP poisoning frequency adjusted to 2.0Hz for minimal network jitter. Global session history is tracked automatically across all devices.
            </div>
          </div>

          <div className="premium-card" style={{ 
            borderLeft: '3px solid var(--primary)', 
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)',
            textAlign: 'center',
            padding: '2rem 1.5rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
              Developed By
            </div>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}>
              Network Visibility &amp; MITM
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                color: 'var(--text)',
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                SP24-BCT-016
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                color: 'var(--text)',
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                FA23-BCT-058
              </div>
            </div>
            <div style={{ 
              marginTop: '1rem', 
              fontSize: '0.7rem', 
              color: 'var(--text-dim)',
              fontStyle: 'italic'
            }}>
              BCT 5th Semester • CYC350 Project
            </div>
          </div>
          
          <div style={{ flexGrow: 1 }}></div>
        </div>
      </div>

      <footer style={{ marginTop: '5rem', padding: '3rem 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Network Visibility &amp; Interception Dashboard
        </div>
        <div style={{ color: 'white', fontSize: '0.9rem' }}>
          Developed by Maaz Ansari | Contact: https://maazansari.vercel.app
        </div>
      </footer>
    </div>
  );
}
