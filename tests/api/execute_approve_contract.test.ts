import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/api.ts';
import { writeFile } from 'fs/promises';
import { STAGING_INDEX_FILE } from '../../src/config.js';

describe('Execute / Approve API contract (regression for blank-screen bug)', () => {
  it('POST /api/approve-all returns well-formed shape with zero pending proposals', async () => {
    await writeFile(STAGING_INDEX_FILE, '[]', 'utf-8');

    const res = await request(app)
      .post('/api/approve-all')
      .send({});

    expect(res.status).toBe(200);
    expect(typeof res.body.success).toBe('boolean');
    expect(typeof res.body.approved).toBe('number');
    expect(typeof res.body.failed).toBe('number');
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(Array.isArray(res.body.proposals)).toBe(true);
    expect(res.body.approved).toBe(0);
    expect(res.body.files).toEqual([]);
    expect(res.body.proposals).toEqual([]);
    expect(Array.isArray(res.body.deleted)).toBe(true);
    expect(Array.isArray(res.body.modified)).toBe(true);
    expect(Array.isArray(res.body.failures)).toBe(true);
    expect(res.body).not.toEqual({ success: true });
  }, 15000);
});
