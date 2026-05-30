import { NextRequest, NextResponse } from 'next/server';
import { createAdminUser } from '@/lib/auth';
import { logAction, AUDIT_ACTIONS } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const result = await createAdminUser(username, password);
    
    if (result.success) {
      const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
      
      await logAction({
        action: AUDIT_ACTIONS.REGISTER_ADMIN,
        username,
        ip_address: ip,
        details: 'Admin user registered during initialization'
      });
      
      const response = NextResponse.json({ 
        message: 'Admin registered successfully',
        user: result.user,
        token: result.token
      });
      
      // Set auth cookie
      response.cookies.set('auth_token', result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 hours
      });
      
      return response;
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
