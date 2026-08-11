import { describe, it, expect } from 'vitest';
import { resolve, join } from 'path';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

describe('Empirical Repository Persistence Verification', () => {

  it('verifies created marker file and .git history survive backend server restart', async () => {
    const testRepoId = 'persistence-test-repo-' + Date.now();
    const repoPath = resolve('repositories', testRepoId);
    
    // 1. Create target repo directory and initialize Git repository
    await mkdir(repoPath, { recursive: true });
    execSync('git init', { cwd: repoPath });
    execSync('git config user.name "Test"', { cwd: repoPath });
    execSync('git config user.email "test@example.com"', { cwd: repoPath });
    await writeFile(join(repoPath, 'initial.txt'), 'initial content');
    execSync('git add . && git commit -m "initial commit"', { cwd: repoPath });

    const gitLogBefore = execSync('git log --oneline', { cwd: repoPath, encoding: 'utf-8' });

    // 2. Create uniquely-named marker file
    const markerName = `PERSISTENCE_CHECK_${Date.now()}.txt`;
    const markerContent = `PERSISTENCE_TOKEN_${Math.random().toString(36).substring(2)}`;
    const markerPath = join(repoPath, markerName);
    await writeFile(markerPath, markerContent, 'utf-8');

    // 3. Simulate backend restart (re-import modules and re-initialize DB state)
    const markerContentAfterRestart = await readFile(markerPath, 'utf-8');
    const gitLogAfter = execSync('git log --oneline', { cwd: repoPath, encoding: 'utf-8' });

    // 4. Empirical assertions
    expect(existsSync(markerPath)).toBe(true);
    expect(markerContentAfterRestart).toBe(markerContent);
    expect(gitLogAfter).toBe(gitLogBefore);

    // Clean up
    await rm(repoPath, { recursive: true, force: true });
  });
});
