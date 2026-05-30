'use client';

import React from 'react';

/**
 * Device interface matching the database schema
 */
export interface Device {
  _id: string;
  ip_address: string;
  mac_address: string;
  vendor: string;
  hostname?: string;
  status: 'active' | 'inactive';
  last_seen: string;
  is_gateway: boolean;
  network_subnet?: string;
}

interface DeviceTableProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
  selectedDeviceId?: string;
}

/**
 * DeviceTable Component
 * Displays a list of discovered devices on the network.
 * Allows selecting a device for MITM simulation.
 */
export default function DeviceTable({ devices, onSelectDevice, selectedDeviceId }: DeviceTableProps) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>IP Address</th>
            <th>MAC Address</th>
            <th>Vendor</th>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr 
              key={device._id} 
              onClick={() => onSelectDevice(device)}
              className={selectedDeviceId === device._id ? 'selected-row' : ''}
              style={{ cursor: 'pointer' }}
            >
              <td>
                <span style={{ fontWeight: 600 }}>{device.ip_address}</span>
              </td>
              <td style={{ fontFamily: 'monospace', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                {device.mac_address}
              </td>
              <td>{device.vendor}</td>
              <td>
                <span className={`status-badge ${device.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                  {device.status}
                </span>
              </td>
              <td style={{ fontSize: '0.875rem' }}>
                {new Date(device.last_seen).toLocaleTimeString()}
              </td>
              <td>
                {device.is_gateway ? (
                  <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--secondary)' }}>
                    Gateway
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>Client</span>
                )}
              </td>
            </tr>
          ))}
          {devices.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                <div style={{ marginBottom: '1rem' }}>No devices discovered yet.</div>
                <div style={{ fontSize: '0.875rem' }}>Start a network scan to see active devices on your lab network.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
