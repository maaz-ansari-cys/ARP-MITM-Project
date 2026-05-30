/**
 * Validation utilities for MITM requests and other inputs
 */

/**
 * Validates MITM request parameters (target IP and gateway IP)
 *
 * Performs the following validations:
 * 1. Validates IPv4 format using regex pattern
 * 2. Checks that each IP octet is in range 0-255
 * 3. Ensures target and gateway IPs are different
 * 4. Checks for reserved IPs (0.0.0.0, 255.255.255.255)
 *
 * @param targetIp - Target device IP address
 * @param gatewayIp - Gateway device IP address
 * @returns Object with valid flag and optional error message
 *
 * @example
 * // Valid IPs
 * validateMitmRequest('192.168.1.100', '192.168.1.1')
 * // Returns: { valid: true }
 *
 * @example
 * // Same IPs
 * validateMitmRequest('192.168.1.1', '192.168.1.1')
 * // Returns: { valid: false, error: 'Target and gateway cannot be the same' }
 *
 * @example
 * // Invalid octet
 * validateMitmRequest('999.999.999.999', '192.168.1.1')
 * // Returns: { valid: false, error: 'IP octets must be 0-255' }
 */
export function validateMitmRequest(
  targetIp: string,
  gatewayIp: string
): { valid: boolean; error?: string } {
  // IPv4 regex pattern: matches format like 192.168.1.1
  // Pattern: (1-3 digits).(1-3 digits).(1-3 digits).(1-3 digits)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

  // Validate target IP format
  if (!ipv4Regex.test(targetIp)) {
    return { valid: false, error: 'Invalid target IP format' };
  }

  // Validate gateway IP format
  if (!ipv4Regex.test(gatewayIp)) {
    return { valid: false, error: 'Invalid gateway IP format' };
  }

  // Check if IPs are the same
  if (targetIp === gatewayIp) {
    return { valid: false, error: 'Target and gateway cannot be the same' };
  }

  // Validate IP octets are in range 0-255
  const targetOctets = targetIp.split('.').map(Number);
  const gatewayOctets = gatewayIp.split('.').map(Number);

  for (const octet of [...targetOctets, ...gatewayOctets]) {
    if (octet < 0 || octet > 255) {
      return { valid: false, error: 'IP octets must be 0-255' };
    }
  }

  // Check for reserved IPs
  if (targetIp === '0.0.0.0' || targetIp === '255.255.255.255') {
    return { valid: false, error: 'Target IP is reserved' };
  }

  if (gatewayIp === '0.0.0.0' || gatewayIp === '255.255.255.255') {
    return { valid: false, error: 'Gateway IP is reserved' };
  }

  return { valid: true };
}
