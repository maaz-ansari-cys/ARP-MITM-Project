'use client';

import React, { useState } from 'react';

interface ScanButtonProps {
  onScan: () => Promise<void>;
  disabled?: boolean;
  onScanningChange?: (scanning: boolean) => void;
}

/**
 * ScanButton Component
 * Triggers a manual ARP scan to discover new devices.
 */
export default function ScanButton({ onScan, disabled: serviceOffline, onScanningChange }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  const isDisabled = scanning || !!serviceOffline;

  const handleScan = async () => {
    setScanning(true);
    onScanningChange?.(true);
    try {
      await onScan();
      setLastScan(new Date());
    } finally {
      setScanning(false);
      onScanningChange?.(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <button 
        className={`btn btn-primary ${scanning ? 'animate-pulse' : ''}`}
        disabled={isDisabled}
        onClick={handleScan}
        style={{ minWidth: '180px', opacity: serviceOffline ? 0.5 : 1 }}
        title={serviceOffline ? 'Python service offline — start it first' : undefined}
      >
        {scanning ? (
          <>
            <svg style={{ width: '16px', height: '16px' }} className="animate-spin" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Discovering...
          </>
        ) : (
          <>
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Trigger ARP Scan
          </>
        )}
      </button>
      
      {lastScan && !scanning && (
        <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
          Last discovery: {lastScan.toLocaleTimeString()}
        </span>
      )}
      
      {scanning && (
        <span style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 500 }}>
          Broadcasting ARP requests...
        </span>
      )}
    </div>
  );
}
