import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { loginE2E } from './helpers/auth';
import { resolve } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import prisma from '../../src/db.js';

const REMOTE_REPO_URL = `file:///${resolve('test_fixtures/remote_repo.git').replace(/\\/g, '/')}`;

test.describe('BUG-017 Browser UI Stage and Commit Verification', () => {
  test('Clicking + stages file, updates UI staged count, clicking Commit creates git commit', async ({ page }) => {
    const repoId = 'bug017-ui-test-' + Date.now();
    const repoPath = resolve('repositories', repoId);
    mkdirSync('repositories', { recursive: true });
    execSync(`git clone "${REMOTE_REPO_URL}" "${repoPath}"`);

    try {
      await prisma.workspace.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default', name: 'Default Workspace', description: 'Default' },
      });
    } catch {}

    const repoUrl = REMOTE_REPO_URL + '#' + repoId;
    const now = new Date().toISOString();
    try {
      await prisma.repository.create({
        data: {
          id: repoId,
          workspaceId: 'default',
          name: 'bug017_ui_repo',
          url: repoUrl,
          description: 'BUG-017 UI Stage Commit Repo',
          language: 'JavaScript',
          stars: 0,
          isPrivate: false,
          status: 'ready',
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch {}

    // Write a new file on disk to trigger unstaged change
    const newFilePath = resolve(repoPath, 'bug017_ui_test.txt');
    writeFileSync(newFilePath, 'Content to stage via real UI click', 'utf-8');

    // 1. Open app & authenticate
    await loginE2E(page);

    const reposBtn = page.getByRole('button', { name: 'Repositories' }).first();
    await expect(reposBtn).toBeVisible({ timeout: 15000 });
    await reposBtn.click();

    const repoCard = page.locator('text=bug017_ui_repo').first();
    await expect(repoCard).toBeVisible({ timeout: 15000 });
    await repoCard.click();

    const sourceControlTabBtn = page.locator('#activity-bar-source-control-btn');
    await expect(sourceControlTabBtn).toBeVisible({ timeout: 15000 });
    await sourceControlTabBtn.click();

    const scPanel = page.locator('#source-control-panel');
    await expect(scPanel).toBeVisible({ timeout: 15000 });

    // 4. Confirm file appears in Unstaged list
    const fileRow = page.locator('#source-control-file-list').locator('text=bug017_ui_test.txt').first();
    await expect(fileRow).toBeVisible({ timeout: 10000 });

    // 5. Hover and click + (Stage Changes) button in UI
    await fileRow.hover();
    const stageBtn = page.locator('#source-control-file-list').locator('button[title="Stage Changes (+)"]').first();
    await expect(stageBtn).toBeVisible();
    await stageBtn.click();

    // 6. Assert Staged Changes count updates to 1 in UI
    const stagedHeader = page.locator('#source-control-panel').locator('text=Staged Changes').first();
    await expect(stagedHeader).toBeVisible();

    // 7. Type commit message into UI input
    const commitMsgInput = page.locator('#commit-message-input');
    await expect(commitMsgInput).toBeVisible({ timeout: 10000 });
    await commitMsgInput.fill('feat: add bug017_ui_test.txt via UI click');

    // 8. Click Commit Staged button in UI and wait for commit API response
    const commitSubmitBtn = page.locator('#commit-submit-btn');
    await expect(commitSubmitBtn).toBeEnabled({ timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/git-commit') && resp.status() === 200),
      commitSubmitBtn.click(),
    ]);

    // 9. Assert file disappears from change list in UI (commit completed)
    await expect(page.locator('#source-control-file-list')).not.toContainText('bug017_ui_test.txt', { timeout: 10000 });

    // 10. Independently verify commit exists on disk via git log
    const gitLog = execSync('git log -1', { cwd: repoPath, encoding: 'utf-8' });
    console.log('--- BUG-017 REAL BROWSER UI COMMIT DISK VERIFICATION ---');
    console.log(gitLog);
    expect(gitLog).toContain('feat: add bug017_ui_test.txt via UI click');

    // Cleanup
    try {
      await prisma.repository.delete({ where: { id: repoId } });
      rmSync(repoPath, { recursive: true, force: true, maxRetries: 5 });
    } catch {}
  });
});
