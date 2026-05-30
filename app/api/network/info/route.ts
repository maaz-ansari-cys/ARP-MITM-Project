import { NextResponse } from 'next/server';
import { proxyToPython } from '@/lib/pythonService';

/**
 * Proxy to Python service /network/info endpoint.
 * Returns auto-detected network configuration (interface, IP, gateway, subnet, SSID).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyToPython('/network/info', 'GET') as Promise<NextResponse>;
}
