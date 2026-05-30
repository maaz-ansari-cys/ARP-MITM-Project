import { NextResponse } from 'next/server';
import { proxyToPython } from '@/lib/pythonService';
import { withAuth } from '@/lib/middleware';

/**
 * Trigger an ARP scan via the Python microservice.
 * Protected by JWT authentication.
 */
export const POST = withAuth(async (request) => {
  return proxyToPython('/network/scan', 'POST') as Promise<NextResponse>;
});
