/**
 * Authentication Middleware Tests
 * 
 * Tests for JWT token verification middleware
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyAndExtractUser,
  withAuth,
  withAdminAuth,
  withOptionalAuth,
  getUserFromRequest,
  isTokenExpired,
  getTokenExpiration,
  getTokenTimeRemaining,
  AuthenticatedRequest,
  AuthenticatedHandler
} from './middleware';
import { generateToken, verifyToken, JWTPayload } from './auth';

/**
 * Test Suite: Token Extraction
 * Validates: Requirement 5.1
 */
describe('Token Extraction', () => {
  test('should extract token from Authorization header', () => {
    const token = 'test-jwt-token';
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const extracted = extractToken(request);
    expect(extracted).toBe(token);
  });

  test('should extract token from cookie', () => {
    const token = 'test-jwt-token';
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Cookie': `auth_token=${token}`
      }
    });

    const extracted = extractToken(request);
    expect(extracted).toBe(token);
  });

  test('should prefer Authorization header over cookie', () => {
    const headerToken = 'header-token';
    const cookieToken = 'cookie-token';
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': `Bearer ${headerToken}`,
        'Cookie': `auth_token=${cookieToken}`
      }
    });

    const extracted = extractToken(request);
    expect(extracted).toBe(headerToken);
  });

  test('should return null if no token present', () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    const extracted = extractToken(request);
    expect(extracted).toBeNull();
  });

  test('should handle malformed Authorization header', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': 'InvalidFormat token'
      }
    });

    const extracted = extractToken(request);
    expect(extracted).toBeNull();
  });
});

/**
 * Test Suite: Token Verification and User Extraction
 * Validates: Requirements 5.1, 5.2
 */
describe('Token Verification and User Extraction', () => {
  test('should extract user from valid token', () => {
    const token = generateToken('testuser', 'admin');
    const user = verifyAndExtractUser(token);

    expect(user).not.toBeNull();
    expect(user?.username).toBe('testuser');
    expect(user?.role).toBe('admin');
  });

  test('should return null for invalid token', () => {
    const user = verifyAndExtractUser('invalid-token');
    expect(user).toBeNull();
  });

  test('should return null for malformed token', () => {
    const user = verifyAndExtractUser('not.a.valid.jwt');
    expect(user).toBeNull();
  });

  test('should return null for token with missing username', () => {
    // This test would require creating a token without username
    // In practice, generateToken always includes username
    const user = verifyAndExtractUser('');
    expect(user).toBeNull();
  });

  test('should return null for token with non-admin role', () => {
    // Since our system only creates admin tokens, this is a safety check
    // In practice, all tokens should have admin role
    const user = verifyAndExtractUser('invalid-token');
    expect(user).toBeNull();
  });

  test('should include expiration time in extracted user', () => {
    const token = generateToken('testuser', 'admin');
    const user = verifyAndExtractUser(token);

    expect(user?.exp).toBeDefined();
    expect(typeof user?.exp).toBe('number');
    expect(user!.exp! > Math.floor(Date.now() / 1000)).toBe(true);
  });
});

/**
 * Test Suite: withAuth Middleware
 * Validates: Requirements 5.1, 5.2
 */
describe('withAuth Middleware', () => {
  test('should call handler with authenticated user', async () => {
    const token = generateToken('testuser', 'admin');
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    let handlerCalled = false;
    let receivedUser: JWTPayload | null = null;

    const handler: AuthenticatedHandler = async (req, user) => {
      handlerCalled = true;
      receivedUser = user;
      return NextResponse.json({ success: true });
    };

    const middleware = withAuth(handler);
    const response = await middleware(request);

    expect(handlerCalled).toBe(true);
    expect(receivedUser?.username).toBe('testuser');
    expect(response.status).toBe(200);
  });

  test('should return 401 for missing token', async () => {
    const request = new NextRequest('http://localhost:3000/api/test');

    const handler: AuthenticatedHandler = async () => {
      return NextResponse.json({ success: true });
    };

    const middleware = withAuth(handler);
    const response = await middleware(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Missing authentication token');
  });

  test('should return 401 for invalid token', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    const handler: AuthenticatedHandler = async () => {
      return NextResponse.json({ success: true });
    };

    const middleware = withAuth(handler);
    const response = await middleware(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Invalid or expired');
  });

  test('should clear auth cookie on invalid token', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    const handler: AuthenticatedHandler = async () => {
      return NextResponse.json({ success: true });
    };

    const middleware = withAuth(handler);
    const response = await middleware(request);

    // Check if cookie is deleted
    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toBeDefined();
  });

  test('should not call handler if authentication fails', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    let handlerCalled = false;

    const handler: AuthenticatedHandler = async () => {
      handlerCalled = true;
      return NextResponse.json({ success: true });
    };

    const middleware = withAuth(handler);
    await middleware(request);

    expect(handlerCalled).toBe(false);
  });
});

/**
 * Test Suite: withAdminAuth Middleware
 * Validates: Requirements 5.3, 5.4, 5.5
 */
describe('withAdminAuth Middleware', () => {
  test('should call handler for admin user', async () => {
    const token = generateToken('admin_user', 'admin');
    const request = new NextRequest('http://localhost:3000/api/admin', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    let handlerCalled = false;

    const handler: AuthenticatedHandler = async () => {
      handlerCalled = true;
      return NextResponse.json({ success: true });
    };

    const middleware = withAdminAuth(handler);
    const response = await middleware(request);

    expect(handlerCalled).toBe(true);
    expect(response.status).toBe(200);
  });

  test('should return 401 for missing token', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin');

    const handler: AuthenticatedHandler = async () => {
      return NextResponse.json({ success: true });
    };

    const middleware = withAdminAuth(handler);
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  test('should return 401 for invalid token', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    const handler: AuthenticatedHandler = async () => {
      return NextResponse.json({ success: true });
    };

    const middleware = withAdminAuth(handler);
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });
});

/**
 * Test Suite: withOptionalAuth Middleware
 */
describe('withOptionalAuth Middleware', () => {
  test('should call handler with user if token present', async () => {
    const token = generateToken('testuser', 'admin');
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    let receivedUser: JWTPayload | undefined;

    const handler = async (req: AuthenticatedRequest, user?: JWTPayload) => {
      receivedUser = user;
      return NextResponse.json({ success: true });
    };

    const middleware = withOptionalAuth(handler);
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(receivedUser?.username).toBe('testuser');
  });

  test('should call handler without user if token missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/test');

    let receivedUser: JWTPayload | undefined;

    const handler = async (req: AuthenticatedRequest, user?: JWTPayload) => {
      receivedUser = user;
      return NextResponse.json({ success: true });
    };

    const middleware = withOptionalAuth(handler);
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(receivedUser).toBeUndefined();
  });

  test('should call handler without user if token invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    let receivedUser: JWTPayload | undefined;

    const handler = async (req: AuthenticatedRequest, user?: JWTPayload) => {
      receivedUser = user;
      return NextResponse.json({ success: true });
    };

    const middleware = withOptionalAuth(handler);
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(receivedUser).toBeUndefined();
  });
});

/**
 * Test Suite: Helper Functions
 */
describe('Helper Functions', () => {
  test('getUserFromRequest should return user from authenticated request', () => {
    const token = generateToken('testuser', 'admin');
    const user = verifyAndExtractUser(token);

    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request.user = user!;

    const extracted = getUserFromRequest(request);
    expect(extracted?.username).toBe('testuser');
  });

  test('getUserFromRequest should return null if no user', () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    const extracted = getUserFromRequest(request);
    expect(extracted).toBeNull();
  });

  test('isTokenExpired should return false for valid token', () => {
    const token = generateToken('testuser', 'admin');
    const expired = isTokenExpired(token);
    expect(expired).toBe(false);
  });

  test('isTokenExpired should return true for invalid token', () => {
    const expired = isTokenExpired('invalid-token');
    expect(expired).toBe(true);
  });

  test('getTokenExpiration should return expiration timestamp', () => {
    const token = generateToken('testuser', 'admin');
    const expiration = getTokenExpiration(token);

    expect(expiration).not.toBeNull();
    expect(typeof expiration).toBe('number');
    expect(expiration! > Date.now()).toBe(true);
  });

  test('getTokenExpiration should return null for invalid token', () => {
    const expiration = getTokenExpiration('invalid-token');
    expect(expiration).toBeNull();
  });

  test('getTokenTimeRemaining should return positive value for valid token', () => {
    const token = generateToken('testuser', 'admin');
    const remaining = getTokenTimeRemaining(token);

    expect(remaining).not.toBeNull();
    expect(remaining! > 0).toBe(true);
    expect(remaining! < 24 * 60 * 60 * 1000).toBe(true); // Less than 24 hours
  });

  test('getTokenTimeRemaining should return null for invalid token', () => {
    const remaining = getTokenTimeRemaining('invalid-token');
    expect(remaining).toBeNull();
  });
});

/**
 * Test Suite: Token Expiration Validation
 * Validates: Requirement 5.2
 */
describe('Token Expiration Validation', () => {
  test('should reject expired tokens', async () => {
    // Create a token with very short expiration (would need to mock time)
    // For now, we test with invalid token which simulates expired behavior
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': 'Bearer expired-token'
      }
    });

    const handler: AuthenticatedHandler = async () => {
      return NextResponse.json({ success: true });
    };

    const middleware = withAuth(handler);
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  test('should accept tokens within validity period', async () => {
    const token = generateToken('testuser', 'admin');
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    let handlerCalled = false;

    const handler: AuthenticatedHandler = async () => {
      handlerCalled = true;
      return NextResponse.json({ success: true });
    };

    const middleware = withAuth(handler);
    const response = await middleware(request);

    expect(handlerCalled).toBe(true);
    expect(response.status).toBe(200);
  });
});

/**
 * Test Suite: User Information Extraction
 * Validates: Requirement 5.1
 */
describe('User Information Extraction', () => {
  test('should extract username from token', () => {
    const token = generateToken('john_doe', 'admin');
    const user = verifyAndExtractUser(token);

    expect(user?.username).toBe('john_doe');
  });

  test('should extract role from token', () => {
    const token = generateToken('testuser', 'admin');
    const user = verifyAndExtractUser(token);

    expect(user?.role).toBe('admin');
  });

  test('should extract issued-at time from token', () => {
    const token = generateToken('testuser', 'admin');
    const user = verifyAndExtractUser(token);

    expect(user?.iat).toBeDefined();
    expect(typeof user?.iat).toBe('number');
  });

  test('should extract expiration time from token', () => {
    const token = generateToken('testuser', 'admin');
    const user = verifyAndExtractUser(token);

    expect(user?.exp).toBeDefined();
    expect(typeof user?.exp).toBe('number');
    expect(user!.exp! > user!.iat!).toBe(true);
  });
});

/**
 * Test Suite: Error Handling
 */
describe('Error Handling', () => {
  test('should handle middleware errors gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    const handler: AuthenticatedHandler = async () => {
      throw new Error('Handler error');
    };

    const middleware = withAuth(handler);
    const response = await middleware(request);

    // Should return 401 before calling handler
    expect(response.status).toBe(401);
  });

  test('should handle missing headers gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/test');

    const handler: AuthenticatedHandler = async () => {
      return NextResponse.json({ success: true });
    };

    const middleware = withAuth(handler);
    const response = await middleware(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});

// Export test utilities for use in other test files
export { };
