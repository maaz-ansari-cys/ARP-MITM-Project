import { describe, it, expect } from 'vitest';
import { sanitizeInput, isValidInput, sanitizeInputs } from './sanitize';

describe('sanitizeInput', () => {
  describe('HTML entity escaping (Requirement 14.1)', () => {
    it('should escape ampersand (&)', () => {
      expect(sanitizeInput('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape less than (<)', () => {
      expect(sanitizeInput('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape greater than (>)', () => {
      expect(sanitizeInput('a > b')).toBe('a &gt; b');
    });

    it('should escape double quotes (")', () => {
      expect(sanitizeInput('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('should escape single quotes (")', () => {
      expect(sanitizeInput("It's a test")).toBe('It&#39;s a test');
    });

    it('should escape forward slash (/)', () => {
      expect(sanitizeInput('path/to/file')).toBe('path&#x2F;to&#x2F;file');
    });

    it('should escape multiple HTML entities', () => {
      expect(sanitizeInput('<img src="test" />')).toBe(
        '&lt;img src=&quot;test&quot; &#x2F;&gt;'
      );
    });

    it('should escape XSS payload', () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const sanitized = sanitizeInput(xssPayload);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });
  });

  describe('Null byte removal (Requirement 14.2)', () => {
    it('should remove null bytes', () => {
      expect(sanitizeInput('hello\0world')).toBe('helloworld');
    });

    it('should remove multiple null bytes', () => {
      expect(sanitizeInput('a\0b\0c\0d')).toBe('abcd');
    });

    it('should handle null byte at start', () => {
      expect(sanitizeInput('\0hello')).toBe('hello');
    });

    it('should handle null byte at end', () => {
      expect(sanitizeInput('hello\0')).toBe('hello');
    });

    it('should remove null bytes before escaping HTML', () => {
      expect(sanitizeInput('test\0<script>')).toBe('test&lt;script&gt;');
    });
  });

  describe('Truncation to max length (Requirement 14.3)', () => {
    it('should truncate to default max length of 255', () => {
      const longString = 'a'.repeat(300);
      const result = sanitizeInput(longString);
      expect(result.length).toBe(255);
    });

    it('should truncate to custom max length', () => {
      const input = 'abcdefghij';
      expect(sanitizeInput(input, 5)).toBe('abcde');
    });

    it('should not truncate if under max length', () => {
      const input = 'hello';
      expect(sanitizeInput(input, 10)).toBe('hello');
    });

    it('should truncate exactly at max length', () => {
      const input = 'a'.repeat(100);
      const result = sanitizeInput(input, 50);
      expect(result.length).toBe(50);
    });

    it('should truncate after escaping HTML entities', () => {
      // When HTML entities are escaped, they take more characters
      // So truncation happens after escaping
      const input = '&'.repeat(100); // Each & becomes &amp; (5 chars)
      const result = sanitizeInput(input, 10);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle zero max length', () => {
      expect(sanitizeInput('hello', 0)).toBe('');
    });
  });

  describe('Empty input handling', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should return empty string for null input', () => {
      expect(sanitizeInput(null as any)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should handle whitespace-only input', () => {
      expect(sanitizeInput('   ')).toBe('   ');
    });
  });

  describe('No exceptions (Requirement 14.5)', () => {
    it('should not throw on normal input', () => {
      expect(() => sanitizeInput('normal input')).not.toThrow();
    });

    it('should not throw on XSS payload', () => {
      expect(() => sanitizeInput('<script>alert("xss")</script>')).not.toThrow();
    });

    it('should not throw on null bytes', () => {
      expect(() => sanitizeInput('test\0\0\0')).not.toThrow();
    });

    it('should not throw on very long input', () => {
      expect(() => sanitizeInput('a'.repeat(10000))).not.toThrow();
    });

    it('should not throw on special characters', () => {
      expect(() => sanitizeInput('!@#$%^&*()_+-=[]{}|;:,.<>?')).not.toThrow();
    });
  });

  describe('Combined scenarios', () => {
    it('should handle HTML entities with null bytes and truncation', () => {
      const input = '<script>\0alert("xss")</script>' + 'a'.repeat(300);
      const result = sanitizeInput(input, 50);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).not.toContain('\0');
      expect(result).not.toContain('<script>');
    });

    it('should sanitize user input from form', () => {
      const userInput = 'John & Jane <script>alert("xss")</script>';
      const result = sanitizeInput(userInput);
      expect(result).toBe('John &amp; Jane &lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should sanitize URL with special characters', () => {
      const url = 'https://example.com/path?query=<test>&id=123';
      const result = sanitizeInput(url);
      expect(result).toContain('&lt;test&gt;');
      expect(result).toContain('&amp;');
    });

    it('should sanitize JSON-like input', () => {
      const json = '{"name":"<script>","value":"test&value"}';
      const result = sanitizeInput(json);
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&amp;');
    });
  });

  describe('Edge cases', () => {
    it('should handle input with only HTML entities', () => {
      expect(sanitizeInput('&<>"\'/')).toBe('&amp;&lt;&gt;&quot;&#39;&#x2F;');
    });

    it('should handle input with only null bytes', () => {
      expect(sanitizeInput('\0\0\0')).toBe('');
    });

    it('should handle numeric input converted to string', () => {
      expect(sanitizeInput('12345')).toBe('12345');
    });

    it('should preserve unicode characters', () => {
      expect(sanitizeInput('Hello 世界 🌍')).toBe('Hello 世界 🌍');
    });

    it('should handle newlines and tabs', () => {
      expect(sanitizeInput('line1\nline2\ttab')).toBe('line1\nline2\ttab');
    });
  });
});

describe('isValidInput', () => {
  it('should return true for non-empty input', () => {
    expect(isValidInput('hello')).toBe(true);
  });

  it('should return false for empty input', () => {
    expect(isValidInput('')).toBe(false);
  });

  it('should return false for null bytes only', () => {
    expect(isValidInput('\0\0\0')).toBe(false);
  });

  it('should return true for whitespace', () => {
    expect(isValidInput('   ')).toBe(true);
  });

  it('should return true for HTML entities', () => {
    expect(isValidInput('<script>')).toBe(true);
  });
});

describe('sanitizeInputs', () => {
  it('should sanitize multiple inputs', () => {
    const inputs = {
      name: 'John & Jane',
      email: 'test<script>@example.com',
      message: 'Hello "World"',
    };

    const result = sanitizeInputs(inputs);

    expect(result.name).toBe('John &amp; Jane');
    expect(result.email).toBe('test&lt;script&gt;@example.com');
    expect(result.message).toBe('Hello &quot;World&quot;');
  });

  it('should apply custom max length to all inputs', () => {
    const inputs = {
      field1: 'a'.repeat(100),
      field2: 'b'.repeat(100),
    };

    const result = sanitizeInputs(inputs, 50);

    expect(result.field1.length).toBe(50);
    expect(result.field2.length).toBe(50);
  });

  it('should handle empty object', () => {
    expect(sanitizeInputs({})).toEqual({});
  });

  it('should preserve object keys', () => {
    const inputs = {
      username: 'test<user>',
      password: 'pass&word',
    };

    const result = sanitizeInputs(inputs);

    expect(Object.keys(result)).toEqual(['username', 'password']);
  });
});
