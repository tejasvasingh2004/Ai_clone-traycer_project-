import { describe, it, expect } from 'vitest';
import { buildContext, contextToString } from '../../src/context.js';

describe('Context Engine Long-Message & Boundary Protections', () => {

  it('1. Large-but-valid request (8,500 characters) builds context within budget', async () => {
    const largePrompt = 'Refactor repository components: ' + 'A'.repeat(8500);
    expect(largePrompt.length).toBe(8532);

    const context = await buildContext(largePrompt);
    const contextString = contextToString(context);

    // Verify context output is capped within budget
    expect(contextString.length).toBeLessThanOrEqual(20050);
    expect(context.relevantFiles.length).toBeLessThanOrEqual(8);
  }, 15000);

  it('2. Genuinely excessive request (>15,000 characters) throws clear user error', async () => {
    const excessivePrompt = 'Huge payload: ' + 'X'.repeat(16000);
    expect(excessivePrompt.length).toBe(16014);

    await expect(buildContext(excessivePrompt)).rejects.toThrow(
      'Your request plus repository context exceeds the model limit - try a smaller request'
    );
  });
});
