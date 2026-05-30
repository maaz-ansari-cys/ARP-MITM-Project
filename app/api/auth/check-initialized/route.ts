import { NextResponse } from 'next/server';
import { checkSystemInitialized } from '@/lib/auth';

export async function GET() {
  try {
    const initialized = await checkSystemInitialized();
    return NextResponse.json({ initialized });
  } catch (error) {
    return NextResponse.json({ error: 'System check failed' }, { status: 500 });
  }
}
