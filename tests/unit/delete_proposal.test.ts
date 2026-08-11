import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { approveProposal, approveAll } from '../../src/approver.ts';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { STAGING_DIR, STAGING_INDEX_FILE } from '../../src/config.ts';
import { resolveFilesToDelete } from '../../src/utils/deleteIntent.ts';
import { resolveSafeProjectPath } from '../../src/utils/pathUtils.ts';

describe('Delete proposal apply path (regression — false success on remove files)', () => {
  let testProjectDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testProjectDir = join(process.cwd(), 'staging', `delete-approver-test-${Date.now()}`);
    await mkdir(join(testProjectDir, 'staging'), { recursive: true });
    process.chdir(testProjectDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testProjectDir, { recursive: true, force: true }).catch(() => {});
  });

  it('applies a delete-type proposal and removes the file from disk', async () => {
    const propId = 'delete-prop-1';
    const targetFile = 'test.md';
    const fullPath = join(testProjectDir, targetFile);

    // 1. File exists on disk before
    await writeFile(fullPath, '# should be deleted\n', 'utf-8');
    expect(existsSync(fullPath)).toBe(true);

    // 2. Stage a delete proposal
    const indexEntry = [{
      id: propId,
      planId: 'plan-delete-1',
      filePath: targetFile,
      createdAt: new Date().toISOString(),
      approved: false,
    }];
    await writeFile(STAGING_INDEX_FILE, JSON.stringify(indexEntry), 'utf-8');
    await writeFile(join(STAGING_DIR, `${propId}.json`), JSON.stringify({
      id: propId,
      planId: 'plan-delete-1',
      filePath: targetFile,
      newContent: '',
      diff: '--- test.md\n+++ /dev/null',
      operation: 'delete',
      approved: false,
      createdAt: new Date().toISOString(),
      originalContent: '# should be deleted\n',
    }), 'utf-8');

    // 3. Apply via real approve path
    const result = await approveProposal(propId, true, testProjectDir);
    expect(result.success).toBe(true);
    expect(result.operation).toBe('delete');

    // 4. Independent filesystem check — file must be gone
    expect(existsSync(fullPath)).toBe(false);
  });

  it('approveAll deletes multiple files and reports per-file results', async () => {
    const files = ['test.md', 'test2.md', 'test3.md'];
    const index: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const propId = `del-batch-${i}`;
      await writeFile(join(testProjectDir, file), `content ${i}\n`, 'utf-8');
      expect(existsSync(join(testProjectDir, file))).toBe(true);

      index.push({
        id: propId,
        planId: 'plan-batch-del',
        filePath: file,
        createdAt: new Date().toISOString(),
        approved: false,
      });
      await writeFile(join(STAGING_DIR, `${propId}.json`), JSON.stringify({
        id: propId,
        planId: 'plan-batch-del',
        filePath: file,
        newContent: '',
        diff: '',
        operation: 'delete',
        approved: false,
        createdAt: new Date().toISOString(),
      }), 'utf-8');
    }
    await writeFile(STAGING_INDEX_FILE, JSON.stringify(index), 'utf-8');

    const results = await approveAll(testProjectDir);
    expect(results.success.length).toBe(3);
    expect(results.failed.length).toBe(0);
    expect(results.success.every(r => r.operation === 'delete')).toBe(true);

    // Independent disk evidence
    for (const file of files) {
      expect(existsSync(join(testProjectDir, file))).toBe(false);
    }
  });

  it('reports honest failure when delete target does not exist', async () => {
    const propId = 'delete-missing';
    const targetFile = 'already-gone.md';
    expect(existsSync(join(testProjectDir, targetFile))).toBe(false);

    await writeFile(STAGING_INDEX_FILE, JSON.stringify([{
      id: propId,
      planId: 'plan-x',
      filePath: targetFile,
      createdAt: new Date().toISOString(),
      approved: false,
    }]), 'utf-8');
    await writeFile(join(STAGING_DIR, `${propId}.json`), JSON.stringify({
      id: propId,
      planId: 'plan-x',
      filePath: targetFile,
      newContent: '',
      diff: '',
      operation: 'delete',
      approved: false,
      createdAt: new Date().toISOString(),
    }), 'utf-8');

    await expect(approveProposal(propId, true, testProjectDir)).rejects.toThrow(/does not exist/i);
  });

  it('rejects path traversal on delete', async () => {
    const propId = 'delete-traverse';
    await writeFile(STAGING_INDEX_FILE, JSON.stringify([{
      id: propId,
      planId: 'plan-x',
      filePath: '../../outside.txt',
      createdAt: new Date().toISOString(),
      approved: false,
    }]), 'utf-8');
    await writeFile(join(STAGING_DIR, `${propId}.json`), JSON.stringify({
      id: propId,
      planId: 'plan-x',
      filePath: '../../outside.txt',
      newContent: '',
      diff: '',
      operation: 'delete',
      approved: false,
      createdAt: new Date().toISOString(),
    }), 'utf-8');

    await expect(approveProposal(propId, true, testProjectDir)).rejects.toThrow(/Access denied/i);
  });
});

describe('deleteIntent inference', () => {
  it('uses explicit filesToDelete when present', () => {
    const files = resolveFilesToDelete({
      id: 'p1',
      taskName: 'Remove Files',
      steps: ['Delete test.md'],
      filesToModify: ['test.md', 'keep.ts'],
      filesToDelete: ['test.md'],
      createdAt: new Date().toISOString(),
    });
    expect(files).toEqual(['test.md']);
  });

  it('infers deletes from Remove Files task + steps mentioning files', () => {
    const files = resolveFilesToDelete({
      id: 'p2',
      taskName: 'Remove Files',
      steps: ['Delete test.md from the repo', 'Remove test2.md'],
      filesToModify: ['test.md', 'test2.md'],
      createdAt: new Date().toISOString(),
    });
    expect(files).toContain('test.md');
    expect(files).toContain('test2.md');
  });
});

describe('resolveSafeProjectPath', () => {
  it('allows paths inside project root', () => {
    const root = join(process.cwd(), 'tmp-safe');
    const resolved = resolveSafeProjectPath(root, 'a/b.txt');
    expect(resolved.startsWith(root)).toBe(true);
  });

  it('rejects traversal outside project root', () => {
    expect(() => resolveSafeProjectPath(process.cwd(), '../../etc/passwd')).toThrow(/Access denied/);
  });
});
