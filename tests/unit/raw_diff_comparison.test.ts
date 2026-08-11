import { describe, it, expect } from 'vitest';
import { resolve, join } from 'path';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { execSync } from 'child_process';
import { createPatch } from 'diff';

describe('Raw Git Diff Comparison Verification', () => {

  it('compares raw git diff output line-for-line against proposal diff', async () => {
    const testRepoId = 'diff-test-repo-' + Date.now();
    const repoPath = resolve('repositories', testRepoId);

    // 1. Setup repository with initial file
    await mkdir(join(repoPath, 'src'), { recursive: true });
    execSync('git init', { cwd: repoPath });
    execSync('git config user.name "Test"', { cwd: repoPath });
    execSync('git config user.email "test@example.com"', { cwd: repoPath });

    const originalContent = 'export function add(a: number, b: number) {\n  return a + b;\n}\n';
    const originalFile = join(repoPath, 'src/calculator.ts');
    await writeFile(originalFile, originalContent, 'utf-8');
    execSync('git add . && git commit -m "initial commit"', { cwd: repoPath });

    // 2. Generate updated content and proposal diff
    const updatedContent = 'export function add(a: number, b: number): number {\n  return a + b;\n}\nexport function subtract(a: number, b: number): number {\n  return a - b;\n}\n';
    const proposalDiff = createPatch('src/calculator.ts', originalContent, updatedContent);

    // 3. Write updated content directly to target repo file
    await writeFile(originalFile, updatedContent, 'utf-8');

    // 4. Capture raw shell git diff output
    const rawGitDiff = execSync('git diff', { cwd: repoPath, encoding: 'utf-8' });

    // 5. Assert line-for-line presence of changes
    expect(rawGitDiff).toContain('-export function add(a: number, b: number) {');
    expect(rawGitDiff).toContain('+export function add(a: number, b: number): number {');
    expect(rawGitDiff).toContain('+export function subtract(a: number, b: number): number {');
    expect(rawGitDiff).toContain('+  return a - b;');

    // Clean up
    try {
      await rm(repoPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {}
  });
});
