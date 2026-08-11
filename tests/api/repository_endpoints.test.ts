import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/api.ts';
import { resolve } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import prisma from '../../src/db.ts';

describe('Repository Controls & Git Status Endpoints', () => {
  const testRepoId = 'test-repo-api-' + Date.now();
  const repoPath = resolve('repositories', testRepoId);

  beforeAll(async () => {
    mkdirSync(repoPath, { recursive: true });
    execSync('git init', { cwd: repoPath });
    writeFileSync(resolve(repoPath, 'index.js'), 'console.log("hello");\n');

    await prisma.workspace.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', name: 'Default Workspace', description: 'Default' },
    });

    await prisma.repository.create({
      data: {
        id: testRepoId,
        workspaceId: 'default',
        name: 'test_repo_api',
        url: 'file:///dummy',
        description: 'Test Repo',
        language: 'JavaScript',
        stars: 0,
        isPrivate: false,
        status: 'ready',
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.repository.delete({ where: { id: testRepoId } });
    } catch {}
    try {
      if (existsSync(repoPath)) {
        rmSync(repoPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      }
    } catch {}
  });

  describe('POST /api/repositories/:id/create-file', () => {
    it('should create an empty file at the requested relative path', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/create-file`)
        .send({ filePath: 'src/new_file.ts' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.path).toBe('src/new_file.ts');

      const fullPath = resolve(repoPath, 'src/new_file.ts');
      expect(existsSync(fullPath)).toBe(true);
    });

    it('should reject path-traversal attempts outside the repository root', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/create-file`)
        .send({ filePath: '../../outside_secret.txt' });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Access denied');
    });

    it('should return 409 Conflict if file already exists', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/create-file`)
        .send({ filePath: 'index.js' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('POST /api/repositories/:id/create-folder', () => {
    it('should create a directory at the requested relative path', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/create-folder`)
        .send({ folderPath: 'subfolder/nested' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.path).toBe('subfolder/nested');

      const fullPath = resolve(repoPath, 'subfolder/nested');
      expect(existsSync(fullPath)).toBe(true);
    });

    it('should reject path-traversal attempts for folder creation', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/create-folder`)
        .send({ folderPath: '../../../dangerous_dir' });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Access denied');
    });
  });

  describe('GET /api/repositories/:id/git-status', () => {
    it('should return empty files array and count 0 for clean repository', async () => {
      const res = await request(app).get(`/api/repositories/${testRepoId}/git-status`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.files)).toBe(true);
      expect(typeof res.body.count).toBe('number');
    });

    it('should report untracked or modified files in git status', async () => {
      // Create a new untracked file directly in repo
      writeFileSync(resolve(repoPath, 'untracked.txt'), 'untracked data');

      const res = await request(app).get(`/api/repositories/${testRepoId}/git-status`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.files.some((f: string) => f.includes('untracked.txt'))).toBe(true);
    });
  });

  describe('POST /api/repositories/:id/search', () => {
    it('should perform text content grep search across repository files', async () => {
      writeFileSync(resolve(repoPath, 'search_target.ts'), 'export const UNIQUE_SEARCH_KEYWORD = 42;\n');

      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/search`)
        .send({ query: 'UNIQUE_SEARCH_KEYWORD' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.results[0].path).toBe('search_target.ts');
      expect(res.body.results[0].text).toContain('UNIQUE_SEARCH_KEYWORD');
    });
  });

  describe('Git Operations (Stage, Unstage, Commit, Diff, Generate Msg)', () => {
    it('should stage, generate commit message, commit, and produce diff', async () => {
      writeFileSync(resolve(repoPath, 'staged_file.js'), 'console.log("staged test");\n');

      // 1. Stage file
      const stageRes = await request(app)
        .post(`/api/repositories/${testRepoId}/git-stage`)
        .send({ filePath: 'staged_file.js' });
      expect(stageRes.status).toBe(200);
      expect(stageRes.body.success).toBe(true);

      // 2. Generate commit message
      const genMsgRes = await request(app)
        .post(`/api/repositories/${testRepoId}/git-generate-commit-msg`);
      expect(genMsgRes.status).toBe(200);
      expect(typeof genMsgRes.body.message).toBe('string');
      expect(genMsgRes.body.message.length).toBeGreaterThan(0);

      // 3. Commit (requires staged changes)
      const commitRes = await request(app)
        .post(`/api/repositories/${testRepoId}/git-commit`)
        .send({ message: 'feat: add staged_file test' });
      expect(commitRes.status).toBe(200);
      expect(commitRes.body.success).toBe(true);

      // 4. File Diff for clean file should return diff string
      const diffRes = await request(app)
        .get(`/api/repositories/${testRepoId}/git-file-diff?path=staged_file.js`);
      expect(diffRes.status).toBe(200);
      expect(typeof diffRes.body.diff).toBe('string');
    });

    it('should reject commit when nothing is staged', async () => {
      writeFileSync(resolve(repoPath, 'unstaged_only.js'), 'console.log("unstaged");\n');

      const commitRes = await request(app)
        .post(`/api/repositories/${testRepoId}/git-commit`)
        .send({ message: 'should fail without staged files' });

      expect(commitRes.status).toBe(500);
    });

    it('should unstage and discard file changes', async () => {
      writeFileSync(resolve(repoPath, 'discard_me.txt'), 'junk data\n');

      // Stage then unstage
      await request(app)
        .post(`/api/repositories/${testRepoId}/git-stage`)
        .send({ filePath: 'discard_me.txt' });

      const unstageRes = await request(app)
        .post(`/api/repositories/${testRepoId}/git-unstage`)
        .send({ filePath: 'discard_me.txt' });
      expect(unstageRes.status).toBe(200);
      expect(unstageRes.body.success).toBe(true);

      // Discard untracked file
      const discardRes = await request(app)
        .post(`/api/repositories/${testRepoId}/git-discard`)
        .send({ filePath: 'discard_me.txt' });
      expect(discardRes.status).toBe(200);
      expect(discardRes.body.success).toBe(true);
      expect(existsSync(resolve(repoPath, 'discard_me.txt'))).toBe(false);
    });
  });
});

