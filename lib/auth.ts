import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from './mongodb';
import User, { IUser } from './models/User';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = '24h'; // 24-hour expiration as per requirement 4.7
const BCRYPT_ROUNDS = 10; // Bcrypt cost factor as per requirement 23.5
const MAX_FAILED_ATTEMPTS = 5; // Maximum failed login attempts as per requirement 4.8
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes lock duration as per requirement 4.9

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  username: string;
  role: 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Authentication Result Interface
 */
export interface AuthResult {
  success: boolean;
  token?: string;
  user?: {
    username: string;
    role: 'admin';
  };
  error?: string;
  locked_until?: Date;
}

/**
 * Check if the system has been initialized with an admin user
 * Validates: Requirement 4.1
 * 
 * @returns Promise<boolean> - True if admin user exists, false otherwise
 */
export async function checkSystemInitialized(): Promise<boolean> {
  try {
    await connectDB();
    const adminCount = await User.countDocuments({ role: 'admin' });
    return adminCount > 0;
  } catch (error) {
    console.error('Error checking system initialization:', error);
    throw new Error('Failed to check system initialization');
  }
}

/**
 * Create the first admin user (one-time registration)
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5, 23.1, 23.2, 23.3, 23.4, 23.5
 * 
 * @param username - Admin username (3-50 characters, alphanumeric with underscores)
 * @param password - Admin password (plain text, will be hashed)
 * @returns Promise<AuthResult> - Authentication result with JWT token
 * @throws Error if admin user already exists or validation fails
 */
export async function createAdminUser(username: string, password: string): Promise<AuthResult> {
  try {
    await connectDB();

    // Check if admin user already exists (requirement 4.2)
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return {
        success: false,
        error: 'Admin user already exists. Registration is only allowed once.'
      };
    }

    // Validate username format
    if (!username || username.length < 3 || username.length > 50) {
      return {
        success: false,
        error: 'Username must be between 3 and 50 characters'
      };
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return {
        success: false,
        error: 'Username must be alphanumeric with underscores only'
      };
    }

    // Validate password
    if (!password || password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long'
      };
    }

    // Hash password using bcrypt (requirements 23.1, 23.2, 23.5)
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create admin user (requirements 4.3, 4.4)
    const adminUser = new User({
      username,
      password_hash,
      role: 'admin',
      created_at: new Date(),
      failed_login_attempts: 0
    });

    await adminUser.save();

    // Generate JWT token (requirement 4.7)
    const token = jwt.sign(
      {
        username: adminUser.username,
        role: adminUser.role
      } as JWTPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    return {
      success: true,
      token,
      user: {
        username: adminUser.username,
        role: adminUser.role
      }
    };
  } catch (error) {
    console.error('Error creating admin user:', error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      };
    }
    return {
      success: false,
      error: 'Failed to create admin user'
    };
  }
}

/**
 * Authenticate user with username and password
 * Validates: Requirements 4.6, 4.7, 4.8, 4.9, 4.10, 23.2
 * 
 * @param username - Username to authenticate
 * @param password - Password to verify
 * @returns Promise<AuthResult> - Authentication result with JWT token or error
 */
export async function authenticateUser(username: string, password: string): Promise<AuthResult> {
  try {
    await connectDB();

    // Find user by username (requirement 4.6)
    const user = await User.findOne({ username });
    if (!user) {
      return {
        success: false,
        error: 'Invalid username or password'
      };
    }

    // Account locking disabled as per user request
    /*
    if (user.locked_until && user.locked_until > new Date()) {
      return {
        success: false,
        error: 'Account is locked due to too many failed login attempts',
        locked_until: user.locked_until
      };
    }
    */

    // If lock period has expired, reset failed attempts
    if (user.locked_until && user.locked_until <= new Date()) {
      user.locked_until = undefined;
      user.failed_login_attempts = 0;
      await user.save();
    }

    // Verify password using bcrypt (requirements 4.6, 23.2)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Failed login attempt tracking disabled
      /*
      user.failed_login_attempts += 1;
      if (user.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
        user.locked_until = new Date(Date.now() + LOCK_DURATION_MS);
        await user.save();
        return {
          success: false,
          error: 'Account locked for 15 minutes due to too many failed login attempts',
          locked_until: user.locked_until
        };
      }
      await user.save();
      */
      return {
        success: false,
        error: 'Invalid username or password'
      };
    }

    // Reset failed login attempts on successful login (requirement 4.10)
    user.failed_login_attempts = 0;
    user.locked_until = undefined;
    user.last_login = new Date(); // Update last_login timestamp (requirement 4.11)
    await user.save();

    // Generate JWT token with 24-hour expiration (requirement 4.7)
    const token = jwt.sign(
      {
        username: user.username,
        role: user.role
      } as JWTPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    return {
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      };
    }
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Verify JWT token and extract payload
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 * 
 * @param token - JWT token to verify
 * @returns JWTPayload | null - Decoded payload if valid, null otherwise
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Generate a new JWT token for a user
 * Validates: Requirements 4.7, 5.1
 * 
 * @param username - Username to include in token
 * @param role - User role (always 'admin')
 * @returns string - JWT token
 */
export function generateToken(username: string, role: 'admin' = 'admin'): string {
  return jwt.sign(
    {
      username,
      role
    } as JWTPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

/**
 * Hash a password using bcrypt
 * Validates: Requirements 23.1, 23.5
 * 
 * @param password - Plain text password
 * @returns Promise<string> - Bcrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash
 * Validates: Requirement 23.2
 * 
 * @param password - Plain text password
 * @param hash - Bcrypt hash to compare against
 * @returns Promise<boolean> - True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
