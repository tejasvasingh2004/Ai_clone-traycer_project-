import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createPlan } from '../../src/planner.ts';
import { generateCode } from '../../src/generator.ts';
import { reviewProposals, rejectProposal } from '../../src/reviewer.ts';
import { approveProposal } from '../../src/approver.ts';
import { verifyCode } from '../../src/verifier.ts';

// Mock AI providers so tests are fast, deterministic, and cost-free
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockImplementation(async (params: any) => {
            const systemContent = params.messages?.find((m: any) => m.role === 'system')?.content || '';
            
            // If prompt is for plan creation
            if (systemContent.includes('expert software architect')) {
              return {
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        taskName: 'Create Math Helper',
                        steps: ['Create src/mathHelper.ts with add function'],
                        filesToModify: ['src/mathHelper.ts'],
                        rationale: 'Provide reusable math functions',
                        dependencyOrder: ['src/mathHelper.ts'],
                      }),
                    },
                  },
                ],
              };
            }

            // If prompt is for code generation
            return {
              choices: [
                {
                  message: {
                    content: '```typescript\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n```',
                  },
                },
              ],
            };
          }),
        },
      };
    },
  };
});

describe('AI Code Generation Workflow Pipeline', () => {
  let originalCwd: string;
  let testProjectDir: string;
  const originalEnv = process.env;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testProjectDir = join(tmpdir(), `traycer-workflow-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await mkdir(testProjectDir, { recursive: true });
    process.chdir(testProjectDir);

    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: 'sk-mock-key-for-testing',
    };

    // Setup base project files
    await writeFile(join(testProjectDir, 'package.json'), JSON.stringify({ name: 'workflow-test' }));
    await writeFile(join(testProjectDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));
    await mkdir(join(testProjectDir, 'src'), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    await rm(testProjectDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should execute full workflow from Plan -> Generate -> Review -> Approve -> Modify -> Verify', async () => {
    // 1. Create Plan
    const plan = await createPlan('Create Math Helper', false);
    expect(plan).toBeDefined();
    expect(plan.taskName).toBe('Create Math Helper');
    expect(plan.filesToModify).toContain('src/mathHelper.ts');

    const planPath = join('plans', `${plan.id}.json`);

    // 2. Generate Code based on Plan
    const proposals = await generateCode(planPath);
    expect(proposals.length).toBe(1);
    expect(proposals[0].filePath).toBe('src/mathHelper.ts');
    expect(proposals[0].newContent).toContain('export function add');

    // 3. Review Proposals
    await expect(reviewProposals()).resolves.not.toThrow();

    // 4. Approve Proposal
    await approveProposal(proposals[0].id, true);

    // 5. Verify File Modification
    const createdFileContent = await readFile(join(testProjectDir, 'src/mathHelper.ts'), 'utf-8');
    expect(createdFileContent).toContain('export function add(a: number, b: number): number');

    // 6. Verify Code
    const verification = await verifyCode();
    expect(verification).toBeDefined();
    expect(verification.success).toBe(true);
  }, 20000);

  it('should handle rejection and feedback flow', async () => {
    const plan = await createPlan('Create Math Helper', false);
    const planPath = join('plans', `${plan.id}.json`);
    const proposals = await generateCode(planPath);

    // Reject proposal with reason
    await expect(rejectProposal('src/mathHelper.ts', 'Need typed return type')).resolves.not.toThrow();
  }, 20000);
});
