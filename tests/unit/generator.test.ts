import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCode } from '../../src/generator.ts';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';

const mockCreate = vi.fn().mockResolvedValue({
  choices: [{ message: { content: 'export const x = 42;' } }],
});

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('generator module (src/generator.ts)', () => {
  let testProjectDir: string;
  let originalCwd: string;
  const originalEnv = process.env;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testProjectDir = join(process.cwd(), 'staging', `generator-test-${Date.now()}`);
    await mkdir(testProjectDir, { recursive: true });
    process.chdir(testProjectDir);
    await writeFile(join(testProjectDir, 'package.json'), JSON.stringify({ name: 'gen-test-pkg' }));
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'export const x = 42;' } }],
    });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    await rm(testProjectDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should throw error when plan file does not exist', async () => {
    await expect(generateCode('non-existent-plan.json')).rejects.toThrow();
  });

  it('should throw error when plan structure is invalid', async () => {
    const invalidPlanPath = join(testProjectDir, 'invalid-plan.json');
    await writeFile(invalidPlanPath, JSON.stringify({ taskName: 'Bad Plan' }));

    await expect(generateCode(invalidPlanPath)).rejects.toThrow('Invalid plan structure');
  });

  it('should handle code generation for existing file modification and generate patch diff', async () => {
    const planPath = join(testProjectDir, 'mod-plan.json');
    const existingFilePath = join(testProjectDir, 'src', 'existing.ts');
    await mkdir(join(testProjectDir, 'src'), { recursive: true });
    await writeFile(existingFilePath, 'export const x = 1;');

    const plan = {
      id: 'plan-mod-1',
      taskName: 'Modify Existing File',
      steps: ['Update src/existing.ts to x = 42'],
      filesToModify: ['src/existing.ts'],
      rationale: 'Update value',
    };
    await writeFile(planPath, JSON.stringify(plan));

    process.env = { ...originalEnv, AI_PROVIDER: 'openai', OPENAI_API_KEY: 'mock-key' };

    const proposals = await generateCode(planPath, 'Previous rejected reason');
    expect(proposals.length).toBe(1);
    expect(proposals[0].operation).toBe('modify');
    expect(proposals[0].diff).toContain('---');
    expect(proposals[0].rejectionHistory?.length).toBe(1);
    expect(proposals[0].rejectionHistory?.[0].reason).toBe('Previous rejected reason');
  });

  it('should throw error if generated code is empty', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '   ' } }],
    });

    const planPath = join(testProjectDir, 'empty-plan.json');
    const plan = {
      id: 'plan-empty-1',
      taskName: 'Empty Gen File',
      steps: ['Generate src/empty.ts'],
      filesToModify: ['src/empty.ts'],
    };
    await writeFile(planPath, JSON.stringify(plan));

    process.env = { ...originalEnv, AI_PROVIDER: 'openai', OPENAI_API_KEY: 'mock-key' };

    await expect(generateCode(planPath)).rejects.toThrow('Generated code is empty after extraction');
  });
});
