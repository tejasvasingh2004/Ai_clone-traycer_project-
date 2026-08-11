import { describe, it, expect } from 'vitest';
import { extractJSON, extractCode, safeParseJSON } from '../../src/utils/jsonUtils.ts';

describe('jsonUtils', () => {
  describe('extractJSON', () => {
    it('should extract JSON from markdown code block with json tag', () => {
      const input = '```json\n{"taskName": "Test", "steps": ["step1"]}\n```';
      const result = extractJSON(input);
      expect(result).toBe('{"taskName": "Test", "steps": ["step1"]}');
    });

    it('should extract JSON from typescript/js markdown code block', () => {
      const input = '```ts\n{"key": "value"}\n```';
      const result = extractJSON(input);
      expect(result).toBe('{"key": "value"}');
    });

    it('should return raw text trimmed when no markdown code block is present', () => {
      const input = '  {"key": "value"}  ';
      const result = extractJSON(input);
      expect(result).toBe('{"key": "value"}');
    });

    it('should return empty string or original value for non-string or falsy input', () => {
      expect(extractJSON('')).toBe('');
      // @ts-expect-error testing invalid input types
      expect(extractJSON(null)).toBe(null);
      // @ts-expect-error testing invalid input types
      expect(extractJSON(undefined)).toBe(undefined);
    });
  });

  describe('extractCode', () => {
    it('should extract code from typescript code block', () => {
      const input = '```typescript\nconst a = 10;\nconsole.log(a);\n```';
      const result = extractCode(input);
      expect(result).toBe('const a = 10;\nconsole.log(a);');
    });

    it('should extract code from ts code block', () => {
      const input = '```ts\nfunction hello() { return "world"; }\n```';
      const result = extractCode(input);
      expect(result).toBe('function hello() { return "world"; }');
    });

    it('should return raw text trimmed when no code block is present', () => {
      const input = '  const x = 5;  ';
      const result = extractCode(input);
      expect(result).toBe('const x = 5;');
    });

    it('should handle falsy/non-string inputs gracefully', () => {
      expect(extractCode('')).toBe('');
      // @ts-expect-error testing non-string input
      expect(extractCode(123)).toBe(123);
    });
  });

  describe('safeParseJSON', () => {
    it('should parse valid JSON object', () => {
      const input = '{"name": "traycer", "version": 1}';
      const parsed = safeParseJSON<{ name: string; version: number }>(input);
      expect(parsed).toEqual({ name: 'traycer', version: 1 });
    });

    it('should parse valid JSON wrapped in markdown fences', () => {
      const input = '```json\n{"status": "ok", "items": [1, 2, 3]}\n```';
      const parsed = safeParseJSON<{ status: string; items: number[] }>(input);
      expect(parsed).toEqual({ status: 'ok', items: [1, 2, 3] });
    });

    it('should return null when parsing invalid JSON', () => {
      const input = 'invalid json { name: foo }';
      const parsed = safeParseJSON(input);
      expect(parsed).toBeNull();
    });

    it('should return null for empty string or malformed input', () => {
      expect(safeParseJSON('')).toBeNull();
      // @ts-expect-error testing invalid input
      expect(safeParseJSON(null)).toBeNull();
    });
  });
});
