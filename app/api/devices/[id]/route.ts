import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Device } from '@/lib/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Add authentication check here
  try {
    await connectDB();
    
    const device = await Device.findById(params.id);
    
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }
    
    return NextResponse.json(device);
  } catch (error) {
    console.error(`Failed to fetch device ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
