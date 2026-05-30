import { NextResponse } from 'next/server';
import { proxyToPython } from '@/lib/pythonService';
import { withAuth } from '@/lib/middleware';

/**
 * Start a MITM session via the Python microservice.
 * Protected by JWT authentication.
 */
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    return proxyToPython('/network/mitm/start', 'POST', body) as Promise<NextResponse>;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
});
