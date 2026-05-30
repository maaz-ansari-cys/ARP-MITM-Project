/**
 * MITM Request Validation Test Suite
 * 
 * Tests for validateMitmRequest() function
 * Run with: npx ts-node lib/validation.test.ts
 */

import { validateMitmRequest } from './validation';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, error: String(error) });
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertContains(str: string | undefined, substring: string, message: string) {
  if (!str || !str.includes(substring)) {
    throw new Error(`${message}: "${str}" does not contain "${substring}"`);
  }
}

async function runTests() {
  console.log('🧪 Starting MITM Request Validation Tests...\n');

  // Valid IP addresses
  test('should accept valid IPv4 addresses', () => {
    const result = validateMitmRequest('192.168.1.100', '192.168.1.1');
    assert(result.valid === true, 'Expected valid to be true');
    assert(result.error === undefined, 'Expected no error');
  });

  test('should accept different valid IPs', () => {
    const result = validateMitmRequest('10.0.0.5', '10.0.0.1');
    assert(result.valid === true, 'Expected valid to be true');
  });

  test('should accept IPs with single digit octets', () => {
    const result = validateMitmRequest('1.2.3.4', '5.6.7.8');
    assert(result.valid === true, 'Expected valid to be true');
  });

  test('should accept IPs with 255 octets', () => {
    const result = validateMitmRequest('255.255.255.254', '255.255.255.253');
    assert(result.valid === true, 'Expected valid to be true');
  });

  test('should accept IPs with 0 octets (except reserved)', () => {
    const result = validateMitmRequest('192.168.0.1', '192.168.0.2');
    assert(result.valid === true, 'Expected valid to be true');
  });

  // Invalid IP format
  test('should reject target IP with invalid format', () => {
    const result = validateMitmRequest('192.168.1', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid target IP format', 'Error message check');
  });

  test('should reject gateway IP with invalid format', () => {
    const result = validateMitmRequest('192.168.1.1', '192.168.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid gateway IP format', 'Error message check');
  });

  test('should reject target IP with too many octets', () => {
    const result = validateMitmRequest('192.168.1.1.1', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid target IP format', 'Error message check');
  });

  test('should reject gateway IP with too many octets', () => {
    const result = validateMitmRequest('192.168.1.1', '192.168.1.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid gateway IP format', 'Error message check');
  });

  test('should reject target IP with non-numeric octets', () => {
    const result = validateMitmRequest('192.168.a.1', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid target IP format', 'Error message check');
  });

  test('should reject gateway IP with non-numeric octets', () => {
    const result = validateMitmRequest('192.168.1.1', '192.168.b.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid gateway IP format', 'Error message check');
  });

  test('should reject target IP with empty octets', () => {
    const result = validateMitmRequest('192.168..1', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid target IP format', 'Error message check');
  });

  test('should reject gateway IP with empty octets', () => {
    const result = validateMitmRequest('192.168.1.1', '192.168..1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid gateway IP format', 'Error message check');
  });

  test('should reject target IP with special characters', () => {
    const result = validateMitmRequest('192.168.1.1!', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid target IP format', 'Error message check');
  });

  test('should reject gateway IP with special characters', () => {
    const result = validateMitmRequest('192.168.1.1', '192.168.1.1!');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid gateway IP format', 'Error message check');
  });

  // IP octet range validation
  test('should reject target IP with octet > 255', () => {
    const result = validateMitmRequest('256.168.1.1', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'IP octets must be 0-255', 'Error message check');
  });

  test('should reject gateway IP with octet > 255', () => {
    const result = validateMitmRequest('192.168.1.1', '192.168.256.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'IP octets must be 0-255', 'Error message check');
  });

  test('should reject target IP with octet 999', () => {
    const result = validateMitmRequest('999.999.999.999', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'IP octets must be 0-255', 'Error message check');
  });

  test('should reject gateway IP with octet 999', () => {
    const result = validateMitmRequest('192.168.1.1', '999.999.999.999');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'IP octets must be 0-255', 'Error message check');
  });

  test('should accept target IP with octet exactly 255', () => {
    const result = validateMitmRequest('255.255.255.254', '192.168.1.1');
    assert(result.valid === true, 'Expected valid to be true');
  });

  test('should accept gateway IP with octet exactly 255', () => {
    const result = validateMitmRequest('192.168.1.1', '255.255.255.254');
    assert(result.valid === true, 'Expected valid to be true');
  });

  // Same IP validation
  test('should reject when target and gateway are the same', () => {
    const result = validateMitmRequest('192.168.1.1', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Target and gateway cannot be the same', 'Error message check');
  });

  test('should reject when both are 10.0.0.1', () => {
    const result = validateMitmRequest('10.0.0.1', '10.0.0.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Target and gateway cannot be the same', 'Error message check');
  });

  test('should reject when both are 172.16.0.1', () => {
    const result = validateMitmRequest('172.16.0.1', '172.16.0.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Target and gateway cannot be the same', 'Error message check');
  });

  // Reserved IP validation
  test('should reject target IP 0.0.0.0', () => {
    const result = validateMitmRequest('0.0.0.0', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Target IP is reserved', 'Error message check');
  });

  test('should reject target IP 255.255.255.255', () => {
    const result = validateMitmRequest('255.255.255.255', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Target IP is reserved', 'Error message check');
  });

  test('should reject gateway IP 0.0.0.0', () => {
    const result = validateMitmRequest('192.168.1.1', '0.0.0.0');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Gateway IP is reserved', 'Error message check');
  });

  test('should reject gateway IP 255.255.255.255', () => {
    const result = validateMitmRequest('192.168.1.1', '255.255.255.255');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Gateway IP is reserved', 'Error message check');
  });

  test('should allow other IPs with 0 octets', () => {
    const result = validateMitmRequest('192.168.0.1', '192.168.0.2');
    assert(result.valid === true, 'Expected valid to be true');
  });

  test('should allow other IPs with 255 octets', () => {
    const result = validateMitmRequest('192.168.255.1', '192.168.255.2');
    assert(result.valid === true, 'Expected valid to be true');
  });

  // Edge cases
  test('should reject empty target IP', () => {
    const result = validateMitmRequest('', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid target IP format', 'Error message check');
  });

  test('should reject empty gateway IP', () => {
    const result = validateMitmRequest('192.168.1.1', '');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid gateway IP format', 'Error message check');
  });

  test('should reject target IP with spaces', () => {
    const result = validateMitmRequest('192.168. 1.1', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid target IP format', 'Error message check');
  });

  test('should reject gateway IP with spaces', () => {
    const result = validateMitmRequest('192.168.1.1', '192.168. 1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid gateway IP format', 'Error message check');
  });

  test('should reject target IP with trailing dot', () => {
    const result = validateMitmRequest('192.168.1.1.', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid target IP format', 'Error message check');
  });

  test('should reject gateway IP with trailing dot', () => {
    const result = validateMitmRequest('192.168.1.1', '192.168.1.1.');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid gateway IP format', 'Error message check');
  });

  test('should reject target IP with leading dot', () => {
    const result = validateMitmRequest('.192.168.1.1', '192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid target IP format', 'Error message check');
  });

  test('should reject gateway IP with leading dot', () => {
    const result = validateMitmRequest('192.168.1.1', '.192.168.1.1');
    assert(result.valid === false, 'Expected valid to be false');
    assertContains(result.error, 'Invalid gateway IP format', 'Error message check');
  });

  // Requirement 6.1-6.4 compliance
  test('should validate IPv4 format using regex (Req 6.1)', () => {
    // Valid IPv4
    assert(validateMitmRequest('192.168.1.1', '10.0.0.1').valid === true, 'Valid IPv4 should pass');
    // Invalid IPv4
    assert(validateMitmRequest('192.168.1', '10.0.0.1').valid === false, 'Invalid IPv4 should fail');
  });

  test('should check IP octets are in range 0-255 (Req 6.2)', () => {
    // Valid octets
    assert(validateMitmRequest('192.168.1.1', '10.0.0.1').valid === true, 'Valid octets should pass');
    // Invalid octets
    assert(validateMitmRequest('256.168.1.1', '10.0.0.1').valid === false, 'Invalid octets should fail');
  });

  test('should ensure target and gateway are different (Req 6.3)', () => {
    // Different IPs
    assert(validateMitmRequest('192.168.1.1', '192.168.1.2').valid === true, 'Different IPs should pass');
    // Same IPs
    assert(validateMitmRequest('192.168.1.1', '192.168.1.1').valid === false, 'Same IPs should fail');
  });

  test('should check for reserved IPs (Req 6.4)', () => {
    // Valid IPs
    assert(validateMitmRequest('192.168.1.1', '192.168.1.2').valid === true, 'Valid IPs should pass');
    // Reserved target
    assert(validateMitmRequest('0.0.0.0', '192.168.1.1').valid === false, 'Reserved target should fail');
    // Reserved gateway
    assert(validateMitmRequest('192.168.1.1', '255.255.255.255').valid === false, 'Reserved gateway should fail');
  });

  // Print results
  console.log('\n📊 Test Results:\n');
  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    if (result.passed) {
      console.log(`✅ ${result.name}`);
      passed++;
    } else {
      console.log(`❌ ${result.name}`);
      console.log(`   Error: ${result.error}`);
      failed++;
    }
  });

  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed out of ${results.length} tests`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    return 0;
  } else {
    console.log('\n⚠️  Some tests failed');
    return 1;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then((exitCode) => {
    process.exit(exitCode);
  }).catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { runTests };
