import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Device } from '@/lib/models';
import { withAuth } from '@/lib/middleware';

/**
 * GET /api/devices
 * Returns discovered devices, optionally filtered by status and current subnet.
 * Protected by JWT authentication.
 */
export const GET = withAuth(async (request) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const subnet = searchParams.get('subnet');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const query: any = {};
    if (status) query.status = status;
    if (subnet) query.network_subnet = subnet;
    
    const [devices, total, active] = await Promise.all([
      Device.find(query)
        .sort({ last_seen: -1 })
        .skip(offset)
        .limit(limit),
      Device.countDocuments(query),
      Device.countDocuments({ ...query, status: 'active' })
    ]);
    
    return NextResponse.json({
      devices,
      total,
      active,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
