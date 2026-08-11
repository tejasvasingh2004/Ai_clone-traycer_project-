import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPlan } from '../../src/planner.ts';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';

const mockOpenAICreate = vi.fn();
const mockAnthropicCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockOpenAICreate,
        },
      };
    },
  };
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockAnthropicCreate,
      };
    },
  };
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenAI {
      getGenerativeModel() {
        return {
          generateContent: vi.fn(),
        };
      }
    },
  };
});

describe('planner module (src/planner.ts)', () => {
  let testProjectDir: string;
  let originalCwd: string;
  const originalEnv = process.env;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testProjectDir = join(process.cwd(), 'staging', `planner-test-${Date.now()}`);
    await mkdir(testProjectDir, { recursive: true });
    process.chdir(testProjectDir);
    await writeFile(join(testProjectDir, 'package.json'), JSON.stringify({ name: 'planner-test-pkg' }));

    mockOpenAICreate.mockReset();
    mockAnthropicCreate.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    await rm(testProjectDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should throw error when AI response is not valid JSON', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Not a JSON response' } }],
    });

    process.env = { ...originalEnv, AI_PROVIDER: 'openai', OPENAI_API_KEY: 'mock-key' };

    await expect(createPlan('Test task')).rejects.toThrow('Invalid JSON response from AI');
  });

  it('should throw error when AI response is missing required fields', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ taskName: 'Incomplete' }) } }],
    });

    process.env = { ...originalEnv, AI_PROVIDER: 'openai', OPENAI_API_KEY: 'mock-key' };

    await expect(createPlan('Test task')).rejects.toThrow('AI response must include taskName, steps, and filesToModify');
  });

  it('should support Anthropic provider', async () => {
    mockAnthropicCreate.mockResolvedValueOnce({
      content: [{
        type: 'text',
        text: JSON.stringify({
          taskName: 'Anthropic Plan',
          steps: ['Step 1'],
          filesToModify: ['src/anthropic.ts'],
          rationale: 'Testing Anthropic',
          dependencyOrder: ['src/anthropic.ts'],
        }),
      }],
    });

    process.env = { ...originalEnv, AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'mock-anthropic-key' };

    const plan = await createPlan('Test task');
    expect(plan.taskName).toBe('Anthropic Plan');
    expect(plan.filesToModify).toContain('src/anthropic.ts');
  });

  it('should support Groq provider', async () => {
    mockOpenAICreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            taskName: 'Groq Plan',
            steps: ['Step 1'],
            filesToModify: ['src/groq.ts'],
            rationale: 'Testing Groq',
          }),
        },
      }],
    });

    process.env = { ...originalEnv, AI_PROVIDER: 'groq', GROQ_API_KEY: 'mock-groq-key' };

    const plan = await createPlan('Test task');
    expect(plan.taskName).toBe('Groq Plan');
  });
});
