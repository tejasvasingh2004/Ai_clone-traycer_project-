import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { approveProposal, approveAll } from '../../src/approver.ts';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { STAGING_DIR, STAGING_INDEX_FILE } from '../../src/config.ts';

describe('approver module (src/approver.ts)', () => {
  let testProjectDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testProjectDir = join(process.cwd(), 'staging', `approver-test-${Date.now()}`);
    await mkdir(join(testProjectDir, 'staging'), { recursive: true });
    process.chdir(testProjectDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testProjectDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should throw error when proposal is not found in staging index', async () => {
    await writeFile(STAGING_INDEX_FILE, '[]', 'utf-8');
    await expect(approveProposal('non-existent-id', true)).rejects.toThrow('Proposal not found');
  });

  it('should throw error when proposal JSON file is missing or corrupted', async () => {
    const indexEntry = [{
      id: 'corrupted-prop-id',
      planId: 'plan-1',
      filePath: 'src/corrupted.ts',
      createdAt: new Date().toISOString(),
      approved: false,
    }];
    await writeFile(STAGING_INDEX_FILE, JSON.stringify(indexEntry), 'utf-8');

    await expect(approveProposal('corrupted-prop-id', true)).rejects.toThrow('Failed to read proposal file');
  });

  it('should successfully apply proposal to filesystem and update staging index', async () => {
    const propId = 'valid-prop-1';
    const targetFile = 'src/valid.ts';
    const indexEntry = [{
      id: propId,
      planId: 'plan-1',
      filePath: targetFile,
      createdAt: new Date().toISOString(),
      approved: false,
    }];
    await writeFile(STAGING_INDEX_FILE, JSON.stringify(indexEntry), 'utf-8');

    const proposalObj = {
      id: propId,
      planId: 'plan-1',
      filePath: targetFile,
      newContent: 'export const valid = true;',
      diff: '+++ src/valid.ts',
      operation: 'create',
      approved: false,
      createdAt: new Date().toISOString(),
    };
    await writeFile(join(STAGING_DIR, `${propId}.json`), JSON.stringify(proposalObj), 'utf-8');

    await approveProposal(targetFile, true);

    const createdContent = await readFile(join(testProjectDir, targetFile), 'utf-8');
    expect(createdContent).toBe('export const valid = true;');

    const updatedIndex = JSON.parse(await readFile(STAGING_INDEX_FILE, 'utf-8'));
    expect(updatedIndex[0].approved).toBe(true);
  });
});
