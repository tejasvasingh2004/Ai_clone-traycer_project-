import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../server/api.ts';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    exec: vi.fn((cmd, options, callback) => {
      if (typeof options === 'function') callback = options;
      callback(null, 'v22.16.0\n', '');
    }),
    execFile: vi.fn((file, args, options, callback) => {
      if (typeof options === 'function') callback = options;
      callback(null, 'Cloned', '');
    }),
  };
});

describe('API Security & Input Validation Suite', () => {
  const testRepoId = 'security-sandbox-repo';
  const repoFolder = join(process.cwd(), 'repositories', testRepoId);

  beforeEach(async () => {
    await mkdir(repoFolder, { recursive: true });
    await writeFile(join(repoFolder, 'safe-file.txt'), 'Safe Content');
  });

  afterEach(async () => {
    await rm(repoFolder, { recursive: true, force: true }).catch(() => {});
  });

  describe('Path Traversal Security Enforcement', () => {
    it('should block relative path traversal with ../ in file content GET route', async () => {
      const res = await request(app).get(`/api/repositories/${testRepoId}/files/../../package.json`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error || res.text).toBeDefined();
    });

    it('should block backslash path traversal with ..\\ in file content GET route', async () => {
      const res = await request(app).get(`/api/repositories/${testRepoId}/files/..\\package.json`);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should block path traversal on file write/POST route', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/files/../../malicious.txt`)
        .send({ content: 'malicious payload' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Repository & Boundary Checks', () => {
    it('should return 404 for non-existent repository file tree', async () => {
      const res = await request(app).get('/api/repositories/non-existent-repo-9999/files');
      expect(res.status).toBe(404);
    });

    it('should return 404 when reading file from non-existent repository', async () => {
      const res = await request(app).get('/api/repositories/non-existent-repo-9999/files/hello.txt');
      expect(res.status).toBe(404);
    });
  });

  describe('Request Body Validation & Malformed Inputs', () => {
    it('should reject POST /api/plan with missing taskDescription', async () => {
      const res = await request(app).post('/api/plan').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('taskDescription');
    });

    it('should reject POST /api/generate with missing planId', async () => {
      const res = await request(app).post('/api/generate').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('planId');
    });

    it('should reject POST /api/import with empty or malformed URL', async () => {
      const res = await request(app).post('/api/import').send({ url: '   ' });
      expect(res.status).toBe(400);
    });

    it('should reject terminal command execution with missing command parameter', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/terminal`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('command');
    });
  });
});
