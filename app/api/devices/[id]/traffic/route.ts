import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { TrafficLog } from '@/lib/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Add authentication check here
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    const query: any = { device_id: params.id };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const trafficLogs = await TrafficLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);
    
    // Calculate total bandwidth
    const totalBandwidth = trafficLogs.reduce((sum, log) => sum + (log.bytes_sent || 0) + (log.bytes_received || 0), 0);
    
    return NextResponse.json({
      traffic_logs: trafficLogs,
      total_bandwidth: totalBandwidth
    });
  } catch (error) {
    console.error(`Failed to fetch traffic for device ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
