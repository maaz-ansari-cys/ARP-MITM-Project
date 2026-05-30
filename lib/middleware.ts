import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './auth';

/**
 * Authentication Middleware for Next.js API Routes
 * 
 * This middleware verifies JWT tokens from request headers and extracts user information.
 * Validates: Requirements 5.1, 5.2
 * 
 * Usage in API routes:
 * ```typescript
 * import { withAuth } from '@/lib/middleware';
 * 
 * export const GET = withAuth(async (request, user) => {
 *   // user is guaranteed to be authenticated
 *   return NextResponse.json({ user });
 * });
 * ```
 */

/**
 * Extended request context with authenticated user information
 */
export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Handler function type for authenticated routes
 */
export type AuthenticatedHandler = (
  request: AuthenticatedRequest,
  user: JWTPayload
) => Promise<NextResponse>;

/**
 * Extract JWT token from request headers
 * Supports both Authorization header and cookies
 * 
 * Validates: Requirement 5.1
 * 
 * @param request - Next.js request object
 * @returns JWT token string or null if not found
 */
export function extractToken(request: NextRequest): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Try cookie as fallback
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Verify JWT token and extract user information
 * 
 * Validates: Requirements 5.1, 5.2
 * 
 * @param token - JWT token to verify
 * @returns JWTPayload if valid, null if invalid or expired
 */
export function verifyAndExtractUser(token: string): JWTPayload | null {
  try {
    const payload = verifyToken(token);
    
    if (!payload) {
      return null;
    }

    // Verify required fields are present
    if (!payload.username || !payload.role) {
      return null;
    }

    // Verify role is 'admin' (only admin users allowed)
    if (payload.role !== 'admin') {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Authentication middleware for API routes
 * 
 * This middleware:
 * 1. Extracts JWT token from request headers or cookies
 * 2. Verifies token signature and expiration
 * 3. Extracts user information from token payload
 * 4. Returns 401 Unauthorized if token is invalid or expired
 * 
 * Validates: Requirements 5.1, 5.2
 * 
 * @param handler - Async handler function that receives authenticated request and user
 * @returns Wrapped handler that performs authentication
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Extract token from request
      const token = extractToken(request);

      if (!token) {
        return NextResponse.json(
          { error: 'Missing authentication token' },
          { status: 401 }
        );
      }

      // Verify token and extract user information
      const user = verifyAndExtractUser(token);

      if (!user) {
        // Token is invalid or expired
        const response = NextResponse.json(
          { error: 'Invalid or expired authentication token' },
          { status: 401 }
        );

        // Clear authentication cookie if present
        response.cookies.delete('auth_token');

        return response;
      }

      // Create authenticated request with user information
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      // Call the handler with authenticated request and user
      return await handler(authenticatedRequest, user);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Admin-only authorization middleware
 * 
 * This middleware ensures the user has admin role.
 * Since all authenticated users are admin, this mainly serves as a safety check.
 * 
 * Validates: Requirements 5.3, 5.4, 5.5
 * 
 * @param handler - Async handler function
 * @returns Wrapped handler that enforces admin role
 */
export function withAdminAuth(handler: AuthenticatedHandler) {
  return withAuth(async (request: AuthenticatedRequest, user: JWTPayload) => {
    // Verify user has admin role
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Call the handler
    return await handler(request, user);
  });
}

/**
 * Middleware to check authentication without requiring it
 * 
 * This middleware extracts user information if token is present,
 * but does not return 401 if token is missing.
 * Useful for routes that have optional authentication.
 * 
 * @param handler - Async handler function
 * @returns Wrapped handler with optional user information
 */
export function withOptionalAuth(
  handler: (request: AuthenticatedRequest, user?: JWTPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const token = extractToken(request);
      let user: JWTPayload | undefined;

      if (token) {
        user = verifyAndExtractUser(token);
      }

      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      return await handler(authenticatedRequest, user);
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Extract user from authenticated request
 * 
 * Helper function to safely extract user from request in handlers
 * 
 * @param request - Authenticated request
 * @returns User payload or null
 */
export function getUserFromRequest(request: AuthenticatedRequest): JWTPayload | null {
  return request.user || null;
}

/**
 * Check if token is expired
 * 
 * Validates: Requirement 5.2
 * 
 * @param token - JWT token to check
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = verifyToken(token);
    return payload === null; // verifyToken returns null if expired
  } catch (error) {
    return true; // Treat any error as expired
  }
}

/**
 * Get token expiration time
 * 
 * @param token - JWT token
 * @returns Expiration timestamp in milliseconds, or null if invalid
 */
export function getTokenExpiration(token: string): number | null {
  try {
    const payload = verifyToken(token);
    if (payload && payload.exp) {
      return payload.exp * 1000; // Convert from seconds to milliseconds
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get time remaining until token expiration
 * 
 * @param token - JWT token
 * @returns Milliseconds until expiration, or null if invalid
 */
export function getTokenTimeRemaining(token: string): number | null {
  const expiration = getTokenExpiration(token);
  if (expiration === null) {
    return null;
  }
  const remaining = expiration - Date.now();
  return remaining > 0 ? remaining : 0;
}
