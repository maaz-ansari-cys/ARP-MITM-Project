import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { MitmSession, TrafficLog, Device } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get last 10 sessions 
    const sessions = await MitmSession.find()
      .sort({ start_time: -1 })
      .limit(10)
      .lean();
      
    return NextResponse.json({ history: sessions });
  } catch (error) {
    console.error('Failed to fetch session history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
