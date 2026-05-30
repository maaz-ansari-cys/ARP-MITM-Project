import { NextResponse } from 'next/server';
import os from 'os';

/**
 * Returns local network info (IP addresses of current machine)
 * Used to display host info on the dashboard.
 */
export async function GET() {
  const interfaces = os.networkInterfaces();
  const ips: { name: string; address: string; family: string }[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      // Only return non-internal IPv4/IPv6 addresses
      if (!addr.internal) {
        ips.push({ name, address: addr.address, family: addr.family });
      }
    }
  }

  // Prefer IPv4
  const ipv4 = ips.filter(i => i.family === 'IPv4');

  return NextResponse.json({
    hostname: os.hostname(),
    ips: ipv4.length > 0 ? ipv4 : ips,
    primary_ip: ipv4[0]?.address ?? 'Unknown',
    platform: os.platform(),
  });
}
