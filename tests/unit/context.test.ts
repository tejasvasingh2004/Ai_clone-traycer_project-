import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildContext, contextToString } from '../../src/context.ts';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('context engine', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `traycer-context-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await mkdir(testDir, { recursive: true });

    // Create a mock package.json
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'mock-test-project',
        description: 'Test project for context engine',
        devDependencies: { vitest: '^2.0.0' },
      })
    );

    // Create mock tsconfig.json
    await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));

    // Create src directory with mock files
    const srcDir = join(testDir, 'src');
    await mkdir(srcDir, { recursive: true });

    // src/types.ts
    await writeFile(
      join(srcDir, 'types.ts'),
      'export interface User { id: string; name: string; }\n'
    );

    // src/service.ts (with ESM import)
    await writeFile(
      join(srcDir, 'service.ts'),
      "import { User } from './types';\nexport function getUser(): User { return { id: '1', name: 'Alice' }; }\n"
    );

    // src/utils.ts (with CommonJS require)
    await writeFile(
      join(srcDir, 'utils.ts'),
      "const types = require('./types');\nfunction calculate_total() { return 10; }\n"
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('buildContext', () => {
    it('should scan project and construct a valid ContextBundle', async () => {
      const bundle = await buildContext('Create a user service function', testDir);

      expect(bundle.taskDescription).toBe('Create a user service function');
      expect(bundle.projectSummary).toContain('Project: mock-test-project');
      expect(bundle.relevantFiles.length).toBeGreaterThan(0);
      expect(bundle.existingPatterns).toBeDefined();
    });

    it('should detect import style and test framework', async () => {
      const bundle = await buildContext('Check test framework', testDir);
      expect(bundle.existingPatterns.testFramework).toBe('vitest');
      expect(['esm', 'commonjs', 'mixed']).toContain(bundle.existingPatterns.importStyle);
    });

    it('should build an import graph for project files', async () => {
      const bundle = await buildContext('Build graph test', testDir);
      expect(bundle.importGraph).toBeDefined();
    });
  });

  describe('contextToString', () => {
    it('should format ContextBundle into a string for AI prompts', async () => {
      const bundle = await buildContext('Format context test', testDir);
      const output = contextToString(bundle);

      expect(output).toContain('Task: Format context test');
      expect(output).toContain('Project Summary:');
      expect(output).toContain('Existing Patterns:');
      expect(output).toContain('Relevant Files:');
      expect(output).toContain('Import Graph:');
    });
  });
});
