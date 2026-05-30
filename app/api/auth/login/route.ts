import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { logAction, AUDIT_ACTIONS } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const result = await authenticateUser(username, password);
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    if (result.success) {
      await logAction({
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        username,
        ip_address: ip,
        details: 'Successful login'
      });
      
      const response = NextResponse.json({ 
        message: 'Login successful',
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
      await logAction({
        action: AUDIT_ACTIONS.LOGIN_FAILURE,
        username,
        ip_address: ip,
        details: `Failed login attempt: ${result.error}`
      });
      
      return NextResponse.json(
        { error: result.error }, 
        { status: result.error?.includes('locked') ? 403 : 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
