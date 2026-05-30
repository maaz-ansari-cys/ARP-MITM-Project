import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

/**
 * Health check endpoint
 * Tests MongoDB connection and returns system status
 */
export async function GET() {
  try {
    // Test MongoDB connection
    await connectDB();
    
    return NextResponse.json({
      status: 'ok',
      message: 'Server is running',
      mongodb: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        mongodb: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
