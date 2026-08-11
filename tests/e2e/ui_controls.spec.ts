import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import prisma from '../../src/db.js';

const REMOTE_REPO_URL = `file:///${resolve('test_fixtures/remote_repo.git').replace(/\\/g, '/')}`;

test.describe('Browser UI Controls Verification: Explorer, Source Control, Activity Bar, Terminal', () => {

  test('Complete Browser UI Interaction Test Suite', async ({ page }) => {
    // Setup cloned repo
    const repoId = 'e2e-ui-controls-' + Date.now();
    const repoPath = resolve('repositories', repoId);
    mkdirSync('repositories', { recursive: true });
    execSync(`git clone "${REMOTE_REPO_URL}" "${repoPath}"`);

    await prisma.workspace.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', name: 'Default Workspace', description: 'Default' },
    });

    const repoUrl = REMOTE_REPO_URL + '#' + repoId;
    const now = new Date().toISOString();
    await prisma.repository.create({
      data: {
        id: repoId,
        workspaceId: 'default',
        name: 'e2e_ui_controls_repo',
        url: repoUrl,
        description: 'E2E UI Controls Repo',
        language: 'JavaScript',
        stars: 0,
        isPrivate: false,
        status: 'ready',
        createdAt: now,
        updatedAt: now,
      },
    });

    // 1. Open app and navigate via UI: Repositories -> Click Repo Card
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const reposBtn = page.getByRole('button', { name: 'Repositories' }).first();
    await reposBtn.click();

    const repoCard = page.locator('text=e2e_ui_controls_repo').first();
    await expect(repoCard).toBeVisible({ timeout: 15000 });
    await repoCard.click();

    // Verify Repository Editor opened
    await expect(page.locator('text=Explorer')).toBeVisible({ timeout: 15000 });

    // ── 2. NEW FILE CONTROL VIA BROWSER UI ──
    const newFileBtn = page.locator('#explorer-new-file-btn');
    await expect(newFileBtn).toBeVisible();
    await newFileBtn.click();

    // Type filename into inline overlay input
    const fileOverlayInput = page.getByPlaceholder('filename.ts');
    await expect(fileOverlayInput).toBeVisible();
    await fileOverlayInput.fill('ui_created_file.ts');
    await fileOverlayInput.press('Enter');

    // Assert file appears in DOM tree immediately
    const createdFileNode = page.locator('text=ui_created_file.ts').first();
    await expect(createdFileNode).toBeVisible({ timeout: 5000 });

    // Independently confirm file exists on disk
    const diskFilePath = resolve(repoPath, 'ui_created_file.ts');
    expect(existsSync(diskFilePath)).toBe(true);

    // ── 3. NEW FOLDER CONTROL VIA BROWSER UI ──
    const newFolderBtn = page.locator('#explorer-new-folder-btn');
    await expect(newFolderBtn).toBeVisible();
    await newFolderBtn.click();

    const folderOverlayInput = page.getByPlaceholder('folder-name');
    await expect(folderOverlayInput).toBeVisible();
    await folderOverlayInput.fill('ui_created_dir');
    await folderOverlayInput.press('Enter');

    // Assert folder node appears in DOM tree
    const createdFolderNode = page.locator('text=ui_created_dir').first();
    await expect(createdFolderNode).toBeVisible({ timeout: 5000 });

    // Independently confirm directory exists on disk
    const diskFolderPath = resolve(repoPath, 'ui_created_dir');
    expect(existsSync(diskFolderPath)).toBe(true);

    // ── 4. REFRESH EXPLORER CONTROL VIA BROWSER UI ──
    // Create an out-of-band file on disk (bypassing UI)
    const outOfBandPath = resolve(repoPath, 'outside_terminal_file.txt');
    writeFileSync(outOfBandPath, 'created directly on disk', 'utf-8');

    // Click Refresh button in explorer header
    const refreshBtn = page.locator('#explorer-refresh-btn');
    await refreshBtn.click();

    // Assert out-of-band file appears in tree without page reload
    const outOfBandNode = page.locator('text=outside_terminal_file.txt').first();
    await expect(outOfBandNode).toBeVisible({ timeout: 5000 });

    // ── 5. COLLAPSE ALL CONTROL VIA BROWSER UI ──
    const collapseBtn = page.locator('#explorer-collapse-btn');
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();

    // ── 6. REAL CONTENT SEARCH PANEL VIA BROWSER UI ──
    const searchTabBtn = page.locator('#activity-bar-search-btn');
    await searchTabBtn.click();

    const searchPanel = page.locator('#search-panel');
    await expect(searchPanel).toBeVisible();

    const searchBox = page.locator('#search-input-box');
    await searchBox.fill('created directly on disk');

    const searchResultItem = page.locator('#search-results-list').locator('text=outside_terminal_file.txt').first();
    await expect(searchResultItem).toBeVisible({ timeout: 8000 });

    // ── 7. SOURCE CONTROL COMMIT & AI COMMIT MSG GENERATOR ──
    const sourceControlTabBtn = page.locator('#activity-bar-source-control-btn');
    await sourceControlTabBtn.click();

    const scPanel = page.locator('#source-control-panel');
    await expect(scPanel).toBeVisible();
    await expect(page.locator('#source-control-file-list')).toContainText('outside_terminal_file.txt');

    // Stage untracked file before commit (commit only includes staged changes)
    const unstagedFileRow = page.locator('#source-control-file-list').locator('text=outside_terminal_file.txt').first();
    await unstagedFileRow.hover();
    const stageAllBtn = page.locator('#source-control-file-list').locator('button[title="Stage Changes (+)"]').first();
    await stageAllBtn.click({ force: true });

    // Click AI Generate Commit Message button
    const genCommitMsgBtn = page.locator('#generate-commit-msg-btn');
    await genCommitMsgBtn.click();

    const commitMsgInput = page.locator('#commit-message-input');
    await expect(commitMsgInput).not.toHaveValue('');

    // Click Commit button
    const commitSubmitBtn = page.locator('#commit-submit-btn');
    await commitSubmitBtn.click();

    // Verify working tree clean
    await expect(page.locator('#source-control-file-list')).toContainText('No unstaged changes in working tree', { timeout: 10000 });

    // ── 8. AI PANEL PLAN, EXECUTE & REVIEW WORKFLOW ──
    // Click Plan button
    const planBtn = page.locator('#ai-workflow-plan-btn');
    await planBtn.click();

    // Verify Plan output in chat bubble
    await expect(page.locator('text=PLAN GENERATED').first()).toBeVisible({ timeout: 15000 });

    // Click Execute button -> Select Execute Generated Plan
    const executeBtn = page.locator('#ai-workflow-execute-btn');
    await executeBtn.click();

    const execPlanOpt = page.locator('#exec-option-plan');
    await expect(execPlanOpt).toBeVisible();
    await execPlanOpt.click();

    await expect(page.locator('text=PLAN EXECUTED SUCCESSFULLY!').first()).toBeVisible({ timeout: 20000 });

    // Click Review button
    const reviewBtn = page.locator('#ai-workflow-review-btn');
    await reviewBtn.click();

    await expect(page.locator('text=REVIEW REPORT').first()).toBeVisible({ timeout: 10000 });

    // ── 9. FILE ATTACHMENT (PAPERCLIP) ──
    const attachBtn = page.locator('#ai-attach-file-btn');
    await attachBtn.click();
    await expect(page.locator('text=Attach File Context')).toBeVisible();

    const attachableFile = page.locator('text=src_file.js').first();
    await expect(attachableFile).toBeVisible({ timeout: 5000 });
    await attachableFile.click();
    await expect(page.locator('.font-mono').filter({ hasText: 'src_file.js' }).first()).toBeVisible();

    // ── 10. NEW TASK & CHAT HISTORY ──
    const chatInput = page.locator('#ai-chat-input');
    await chatInput.fill('History test task');
    await page.locator('#ai-send-btn').click();
    await expect(page.locator('text=History test task').first()).toBeVisible({ timeout: 15000 });

    await page.locator('button[title="Start New Task / Chat"]').click();
    await expect(page.locator('text=PLAN GENERATED')).toHaveCount(0, { timeout: 5000 });

    await page.locator('button[title="Task History"]').click();
    await expect(page.locator('text=Saved Task Sessions')).toBeVisible();
    const savedSession = page.locator('text=Saved Task Sessions').locator('..').locator('.cursor-pointer').first();
    await expect(savedSession).toBeVisible();
    await savedSession.click();
    await expect(page.locator('text=PLAN GENERATED').first()).toBeVisible({ timeout: 5000 });

    // Clean up repo record and disk directory
    try {
      await prisma.repository.delete({ where: { id: repoId } });
      rmSync(repoPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {}
  });
});
