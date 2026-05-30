/**
 * Authentication Middleware Usage Examples
 * 
 * This file demonstrates how to use the authentication middleware
 * in Next.js API routes.
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withAdminAuth, withOptionalAuth, AuthenticatedRequest } from './middleware';
import { JWTPayload } from './auth';

/**
 * Example 1: Basic Protected Route
 * 
 * This route requires authentication. If the user is not authenticated,
 * it returns 401 Unauthorized.
 * 
 * Usage: GET /api/protected
 * Headers: Authorization: Bearer <jwt_token>
 */
export const exampleProtectedRoute = withAuth(async (request, user) => {
  // At this point, user is guaranteed to be authenticated
  // user contains: { username, role, iat, exp }

  return NextResponse.json({
    message: 'This is a protected route',
    user: {
      username: user.username,
      role: user.role
    }
  });
});

/**
 * Example 2: Admin-Only Route
 * 
 * This route requires admin authentication. Since all authenticated users
 * are admin, this is mainly a safety check.
 * 
 * Usage: POST /api/admin/action
 * Headers: Authorization: Bearer <jwt_token>
 */
export const exampleAdminRoute = withAdminAuth(async (request, user) => {
  // User is guaranteed to be admin
  const body = await request.json();

  return NextResponse.json({
    message: 'Admin action performed',
    performedBy: user.username,
    action: body.action
  });
});

/**
 * Example 3: Optional Authentication Route
 * 
 * This route works with or without authentication.
 * If a valid token is provided, user information is available.
 * If no token is provided, the route still works.
 */
export const exampleOptionalAuthRoute = withOptionalAuth(
  async (request: AuthenticatedRequest, user?: JWTPayload) => {
    if (user) {
      return NextResponse.json({
        message: 'Authenticated request',
        user: {
          username: user.username,
          role: user.role
        }
      });
    } else {
      return NextResponse.json({
        message: 'Unauthenticated request',
        user: null
      });
    }
  }
);

/**
 * Example 4: Extracting Request Data
 * 
 * This example shows how to extract and use request data
 * in an authenticated route.
 */
export const exampleDataExtractionRoute = withAuth(async (request, user) => {
  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('device_id');

  // Extract request body
  let body = null;
  if (request.method === 'POST' || request.method === 'PUT') {
    body = await request.json();
  }

  return NextResponse.json({
    message: 'Data extraction example',
    user: user.username,
    deviceId,
    body
  });
});

/**
 * Example 5: Error Handling in Protected Route
 * 
 * This example shows how to handle errors in a protected route.
 */
export const exampleErrorHandlingRoute = withAuth(async (request, user) => {
  try {
    // Simulate some operation that might fail
    const data = await request.json();

    if (!data.required_field) {
      return NextResponse.json(
        { error: 'Missing required field' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Operation successful',
      user: user.username
    });
  } catch (error) {
    console.error('Route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * Example 6: Logging Authenticated Requests
 * 
 * This example shows how to log authenticated requests.
 */
export const exampleLoggingRoute = withAuth(async (request, user) => {
  // Log the request
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
  console.log(`Authenticated user: ${user.username}`);
  console.log(`User role: ${user.role}`);

  return NextResponse.json({
    message: 'Request logged',
    user: user.username
  });
});

/**
 * Example 7: Conditional Logic Based on User
 * 
 * This example shows how to implement conditional logic
 * based on user information.
 */
export const exampleConditionalRoute = withAuth(async (request, user) => {
  // Different behavior based on user
  if (user.username === 'admin') {
    return NextResponse.json({
      message: 'Welcome admin',
      permissions: ['read', 'write', 'delete']
    });
  } else {
    return NextResponse.json({
      message: 'Welcome user',
      permissions: ['read']
    });
  }
});

/**
 * Example 8: Combining Multiple Middlewares
 * 
 * This example shows how to combine multiple middleware functions.
 * Note: In practice, you would nest them or create a custom wrapper.
 */
export const exampleCombinedMiddlewareRoute = withAdminAuth(async (request, user) => {
  // This route is both authenticated and admin-only
  // Additional custom logic can be added here

  const method = request.method;
  const url = new URL(request.url);

  return NextResponse.json({
    message: 'Combined middleware example',
    user: user.username,
    method,
    path: url.pathname
  });
});

/**
 * Example 9: Rate Limiting with Authentication
 * 
 * This example shows how to implement rate limiting
 * in an authenticated route.
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const exampleRateLimitingRoute = withAuth(async (request, user) => {
  const now = Date.now();
  const key = user.username;

  // Get or create rate limit entry
  let entry = requestCounts.get(key);
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + 60000 }; // 1 minute window
    requestCounts.set(key, entry);
  }

  // Check rate limit
  if (entry.count >= 10) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // Increment counter
  entry.count++;

  return NextResponse.json({
    message: 'Request processed',
    user: user.username,
    requestCount: entry.count
  });
});

/**
 * Example 10: Token Information Extraction
 * 
 * This example shows how to extract and use token information.
 */
export const exampleTokenInfoRoute = withAuth(async (request, user) => {
  // Token information is available in the user object
  const issuedAt = new Date((user.iat || 0) * 1000);
  const expiresAt = new Date((user.exp || 0) * 1000);
  const now = new Date();

  const timeRemaining = expiresAt.getTime() - now.getTime();
  const timeRemainingMinutes = Math.floor(timeRemaining / 60000);

  return NextResponse.json({
    message: 'Token information',
    user: user.username,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    timeRemainingMinutes
  });
});

/**
 * Real-World Example: Device Management API
 * 
 * This example shows a realistic device management endpoint
 * with authentication, error handling, and data validation.
 */
export const exampleDeviceManagementRoute = withAuth(async (request, user) => {
  try {
    const method = request.method;
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');

    // GET /api/devices?id=123
    if (method === 'GET') {
      if (!deviceId) {
        return NextResponse.json(
          { error: 'Device ID is required' },
          { status: 400 }
        );
      }

      // Simulate fetching device
      return NextResponse.json({
        id: deviceId,
        name: 'Device 1',
        ip: '192.168.1.100',
        status: 'active',
        fetchedBy: user.username
      });
    }

    // POST /api/devices
    if (method === 'POST') {
      const body = await request.json();

      if (!body.name || !body.ip) {
        return NextResponse.json(
          { error: 'Name and IP are required' },
          { status: 400 }
        );
      }

      // Simulate creating device
      return NextResponse.json(
        {
          id: 'new-device-id',
          name: body.name,
          ip: body.ip,
          status: 'active',
          createdBy: user.username
        },
        { status: 201 }
      );
    }

    // DELETE /api/devices?id=123
    if (method === 'DELETE') {
      if (!deviceId) {
        return NextResponse.json(
          { error: 'Device ID is required' },
          { status: 400 }
        );
      }

      // Simulate deleting device
      return NextResponse.json({
        message: 'Device deleted',
        id: deviceId,
        deletedBy: user.username
      });
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  } catch (error) {
    console.error('Device management error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * Usage in actual API route file:
 * 
 * // app/api/devices/route.ts
 * import { exampleDeviceManagementRoute } from '@/lib/middleware-examples';
 * 
 * export const GET = exampleDeviceManagementRoute;
 * export const POST = exampleDeviceManagementRoute;
 * export const DELETE = exampleDeviceManagementRoute;
 */
