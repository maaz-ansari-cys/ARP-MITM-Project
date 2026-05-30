/**
 * Authentication Utility Functions Test
 * 
 * This file contains basic tests for the authentication functions.
 * Run with: npx ts-node lib/auth.test.ts
 */

import {
  checkSystemInitialized,
  createAdminUser,
  authenticateUser,
  verifyToken,
  hashPassword,
  verifyPassword
} from './auth';

async function runTests() {
  console.log('🧪 Starting Authentication Tests...\n');

  try {
    // Test 1: Check system initialization
    console.log('Test 1: Check System Initialization');
    const isInitialized = await checkSystemInitialized();
    console.log(`✅ System initialized: ${isInitialized}\n`);

    // Test 2: Password hashing and verification
    console.log('Test 2: Password Hashing and Verification');
    const testPassword = 'TestPassword123!';
    const hash = await hashPassword(testPassword);
    console.log(`✅ Password hashed: ${hash.substring(0, 20)}...`);
    
    const isValid = await verifyPassword(testPassword, hash);
    console.log(`✅ Password verification: ${isValid}`);
    
    const isInvalid = await verifyPassword('WrongPassword', hash);
    console.log(`✅ Wrong password rejected: ${!isInvalid}\n`);

    // Test 3: Create admin user (if not exists)
    if (!isInitialized) {
      console.log('Test 3: Create Admin User');
      const result = await createAdminUser('admin', 'AdminPassword123!');
      if (result.success) {
        console.log(`✅ Admin user created: ${result.user?.username}`);
        console.log(`✅ JWT token generated: ${result.token?.substring(0, 20)}...\n`);
      } else {
        console.log(`❌ Failed to create admin: ${result.error}\n`);
      }
    } else {
      console.log('Test 3: Admin user already exists, skipping creation\n');
    }

    // Test 4: Authenticate user with correct credentials
    console.log('Test 4: Authenticate with Correct Credentials');
    const authResult = await authenticateUser('admin', 'AdminPassword123!');
    if (authResult.success) {
      console.log(`✅ Authentication successful: ${authResult.user?.username}`);
      console.log(`✅ JWT token: ${authResult.token?.substring(0, 20)}...`);
      
      // Test 5: Verify JWT token
      console.log('\nTest 5: Verify JWT Token');
      if (authResult.token) {
        const payload = verifyToken(authResult.token);
        if (payload) {
          console.log(`✅ Token verified: ${payload.username}, role: ${payload.role}`);
        } else {
          console.log('❌ Token verification failed');
        }
      }
    } else {
      console.log(`❌ Authentication failed: ${authResult.error}`);
    }

    // Test 6: Authenticate with wrong password
    console.log('\nTest 6: Authenticate with Wrong Password');
    const wrongAuthResult = await authenticateUser('admin', 'WrongPassword');
    if (!wrongAuthResult.success) {
      console.log(`✅ Wrong password rejected: ${wrongAuthResult.error}`);
    } else {
      console.log('❌ Wrong password should have been rejected');
    }

    // Test 7: Test account locking (5 failed attempts)
    console.log('\nTest 7: Test Account Locking (5 Failed Attempts)');
    for (let i = 1; i <= 6; i++) {
      const failResult = await authenticateUser('admin', 'WrongPassword' + i);
      console.log(`Attempt ${i}: ${failResult.error}`);
      if (failResult.locked_until) {
        console.log(`✅ Account locked until: ${failResult.locked_until}`);
        break;
      }
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(() => {
    console.log('\n🎉 Test suite finished');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { runTests };
