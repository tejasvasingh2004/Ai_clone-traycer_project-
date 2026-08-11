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

describe('Express API Server Endpoints', () => {
  describe('GET /health', () => {
    it('should return status ok and timestamp', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/status', () => {
    it('should return system summary status object', async () => {
      const res = await request(app).get('/api/status');
      expect(res.status).toBe(200);
      expect(typeof res.body.plans).toBe('number');
      expect(typeof res.body.proposals).toBe('number');
    }, 15000);
  });

  describe('Plans Endpoints', () => {
    it('GET /api/plans should return array of plans', async () => {
      const res = await request(app).get('/api/plans');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    }, 15000);

    it('POST /api/plan should reject empty taskDescription', async () => {
      const res = await request(app)
        .post('/api/plan')
        .send({ taskDescription: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('taskDescription');
    });

    it('GET /api/plans/:id should return 404 for non-existent plan', async () => {
      const res = await request(app).get('/api/plans/non-existent-plan-id');
      expect(res.status).toBe(404);
    });
  });

  describe('Proposals Endpoints', () => {
    it('GET /api/proposals should return array of proposals', async () => {
      const res = await request(app).get('/api/proposals');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/generate should reject request missing planId', async () => {
      const res = await request(app)
        .post('/api/generate')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('planId');
    });

    it('POST /api/approve/:id should return 404 for non-existent proposal', async () => {
      const res = await request(app).post('/api/approve/non-existent-proposal-id');
      expect(res.status).toBe(404);
    });
  });

  describe('Repositories Endpoints', () => {
    it('GET /api/repositories should return array of repositories', async () => {
      const res = await request(app).get('/api/repositories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/import should reject invalid or empty URL', async () => {
      const res = await request(app)
        .post('/api/import')
        .send({ url: 'not-a-valid-url-with spaces' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('DELETE /api/repositories/:id should return 404 for non-existent repo ID', async () => {
      const res = await request(app).delete('/api/repositories/non-existent-repo-id');
      expect(res.status).toBe(404);
    });
  });

  describe('Repository File Operations & Path Traversal Security', () => {
    const testRepoId = 'test-security-repo';
    const repoFolder = join(process.cwd(), 'repositories', testRepoId);

    beforeEach(async () => {
      await mkdir(repoFolder, { recursive: true });
      await writeFile(join(repoFolder, 'hello.txt'), 'Hello Security Test');
    });

    afterEach(async () => {
      await rm(repoFolder, { recursive: true, force: true }).catch(() => {});
    });

    it('GET /api/repositories/:id/files should return file tree', async () => {
      const res = await request(app).get(`/api/repositories/${testRepoId}/files`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((node: any) => node.name === 'hello.txt')).toBe(true);
    });

    it('GET /api/repositories/:id/files/hello.txt should return file content', async () => {
      const res = await request(app).get(`/api/repositories/${testRepoId}/files/hello.txt`);
      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Hello Security Test');
    });

    it('POST /api/repositories/:id/files/hello.txt should update file content', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/files/hello.txt`)
        .send({ content: 'Updated Content' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should block path traversal attempts with 500/400 access denied', async () => {
      const res = await request(app).get(`/api/repositories/${testRepoId}/files/../../package.json`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error || res.text).toBeDefined();
    });
  });

  describe('Repository Terminal Execution', () => {
    const testRepoId = 'test-term-repo';
    const repoFolder = join(process.cwd(), 'repositories', testRepoId);

    beforeEach(async () => {
      await mkdir(repoFolder, { recursive: true });
    });

    afterEach(async () => {
      await rm(repoFolder, { recursive: true, force: true }).catch(() => {});
    });

    it('POST /api/repositories/:id/terminal should execute safe command in repo directory', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/terminal`)
        .send({ command: 'node -v' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.output).toContain('v');
    });

    it('POST /api/repositories/:id/terminal should reject missing command', async () => {
      const res = await request(app)
        .post(`/api/repositories/${testRepoId}/terminal`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('command');
    });
  });

  describe('POST /api/verify', () => {
    it('should run verification and return verification result', async () => {
      const res = await request(app).post('/api/verify').send({});
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success');
      expect(Array.isArray(res.body.errors)).toBe(true);
    }, 20000);
  });
});
