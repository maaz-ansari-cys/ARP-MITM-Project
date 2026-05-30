import { NextResponse } from 'next/server';
import { proxyToPython } from '@/lib/pythonService';
import { withAuth } from '@/lib/middleware';

/**
 * Get active MITM sessions.
 * Protected by JWT authentication.
 */
export const GET = withAuth(async (request) => {
  return proxyToPython('/network/mitm/status', 'GET') as Promise<NextResponse>;
});
