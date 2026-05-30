/**
 * API client for the frontend.
 * Provides a simple wrapper around fetch for dashboard requests.
 */

export async function fetchApi(path: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  const response = await fetch(path, { ...options, headers });
  
  // Handle empty responses
  const contentType = response.headers.get('content-type');
  let data = {};
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg = (data as any).error || (data as any).detail || 'API request failed';
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * API calls used by the dashboard.
 */
export const api = {
  getDevices: (status?: string, subnet?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (subnet) params.set('subnet', subnet);
    const qs = params.toString();
    return fetchApi(`/api/devices${qs ? `?${qs}` : ''}`);
  },
    
  startScan: () => 
    fetchApi('/api/scan/start', { method: 'POST' }),
    
  startMitm: (targetIp: string, gatewayIp: string) => 
    fetchApi('/api/mitm/start', { 
      method: 'POST', 
      body: JSON.stringify({ target_ip: targetIp, gateway_ip: gatewayIp }),
    }),
    
  stopMitm: (sessionId: string) => 
    fetchApi('/api/mitm/stop', { 
      method: 'POST', 
      body: JSON.stringify({ session_id: sessionId }),
    }),
    
  getMitmStatus: () => 
    fetchApi('/api/mitm/status'),

  getMitmHistory: () => 
    fetchApi('/api/mitm/history'),
    
  getDeviceTraffic: (deviceId: string) => 
    fetchApi(`/api/devices/${deviceId}/traffic`),

  /** Fetch auto-detected network info from Python service */
  getNetworkInfo: () =>
    fetchApi('/api/network/info'),
};
