import { describe, it, expect, vi } from 'vitest';
import { parseTypeScriptErrors, parseESLintOutput, getSuggestedFix, verifyCode } from '../../src/verifier.ts';

// Mock child_process exec for unit testing
vi.mock('child_process', () => {
  return {
    exec: vi.fn((cmd, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
      }
      if (cmd.includes('tsc')) {
        callback(null, { stdout: '', stderr: '' });
      } else if (cmd.includes('eslint')) {
        callback(null, { stdout: '[]', stderr: '' });
      } else {
        callback(null, { stdout: '', stderr: '' });
      }
    }),
  };
});

describe('verifier', () => {
  describe('parseTypeScriptErrors', () => {
    it('should parse valid TypeScript compiler output lines', () => {
      const output = `src/app.ts(12,5): error TS2304: Cannot find name 'foo'.\nsrc/utils.ts(1,1): error TS2307: Cannot find module.`;
      const errors = parseTypeScriptErrors(output);
      expect(errors.length).toBe(2);
      expect(errors[0]).toContain('TS2304');
    });

    it('should return empty array when no errors in output', () => {
      const output = 'Compilation successful.';
      expect(parseTypeScriptErrors(output)).toEqual([]);
    });
  });

  describe('parseESLintOutput', () => {
    it('should parse ESLint JSON error and warning output', () => {
      const json = JSON.stringify([
        {
          filePath: 'src/index.ts',
          messages: [
            { line: 5, column: 2, message: 'Unused var', severity: 2, ruleId: 'no-unused-vars' },
            { line: 10, column: 1, message: 'Prefer const', severity: 1, ruleId: 'prefer-const' },
          ],
        },
      ]);
      const result = parseESLintOutput(json);
      expect(result.errors.length).toBe(1);
      expect(result.warnings.length).toBe(1);
      expect(result.errors[0]).toContain('no-unused-vars');
    });

    it('should handle malformed JSON gracefully', () => {
      const result = parseESLintOutput('invalid-json');
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('getSuggestedFix', () => {
    it('should return actionable suggestion for missing module errors', () => {
      const fix = getSuggestedFix("Cannot find module './nonexistent'");
      expect(fix).toContain('This import doesn\'t exist');
    });

    it('should return suggestion for property non-existent on type', () => {
      const fix = getSuggestedFix('Property foo does not exist on type Bar');
      expect(fix).toContain('Type mismatch');
    });

    it('should return suggestion for TS2307/TS2304 errors', () => {
      const fix = getSuggestedFix('error TS2307: Type or declaration missing');
      expect(fix).toContain('Module or type not found');
    });

    it('should return null for unrecognized errors', () => {
      const fix = getSuggestedFix('Some obscure error');
      expect(fix).toBeNull();
    });
  });

  describe('verifyCode', () => {
    it('should return a VerificationResult object structure', async () => {
      const result = await verifyCode();
      expect(result).toHaveProperty('success');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
