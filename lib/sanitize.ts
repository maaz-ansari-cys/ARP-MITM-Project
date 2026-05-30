/**
 * Input sanitization utilities for preventing XSS and injection attacks
 * Validates: Requirements 14.1, 14.2, 14.3
 */

/**
 * Sanitizes user input by escaping HTML entities, removing null bytes, and truncating to max length
 * 
 * @param input - The user input string to sanitize
 * @param maxLength - Maximum length to truncate to (default: 255)
 * @returns Sanitized string safe for use in HTML and database operations
 * 
 * Requirement 14.1: Escape HTML entities including &, <, >, ", ', and /
 * Requirement 14.2: Remove null bytes
 * Requirement 14.3: Truncate to maximum length specified by the caller
 */
export function sanitizeInput(input: string, maxLength: number = 255): string {
  // Handle null, undefined, or non-string inputs gracefully
  if (input === null || input === undefined) {
    return '';
  }

  // Convert to string if not already
  let sanitized = String(input);

  // Step 1: Remove null bytes (Requirement 14.2)
  sanitized = sanitized.replace(/\0/g, '');

  // Step 2: Escape HTML entities (Requirement 14.1)
  // Map of characters to their HTML entity equivalents
  const htmlEntityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  sanitized = sanitized.replace(/[&<>"'\/]/g, (char) => htmlEntityMap[char] || char);

  // Step 3: Truncate to maximum length (Requirement 14.3)
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates that a string is not empty after sanitization
 * 
 * @param input - The input string to validate
 * @returns true if input is not empty after sanitization, false otherwise
 */
export function isValidInput(input: string): boolean {
  return sanitizeInput(input).length > 0;
}

/**
 * Sanitizes multiple inputs at once
 * 
 * @param inputs - Object with string values to sanitize
 * @param maxLength - Maximum length for each value (default: 255)
 * @returns Object with sanitized values
 */
export function sanitizeInputs(
  inputs: Record<string, string>,
  maxLength: number = 255
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(inputs)) {
    sanitized[key] = sanitizeInput(value, maxLength);
  }

  return sanitized;
}
