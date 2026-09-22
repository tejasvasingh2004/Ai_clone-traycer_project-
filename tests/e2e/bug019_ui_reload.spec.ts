import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { loginE2E } from './helpers/auth';
import { resolve } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import prisma from '../../src/db.js';

const REMOTE_REPO_URL = `file:///${resolve('test_fixtures/remote_repo.git').replace(/\\/g, '/')}`;

test.describe('BUG-019 Browser UI Page Reload History Persistence Verification', () => {
  test('Chat session persists in History drawer across real page.reload()', async ({ page }) => {
    const repoId = 'bug019-ui-reload-' + Date.now();
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
          name: 'bug019_ui_repo',
          url: repoUrl,
          description: 'BUG-019 UI Reload Repo',
          language: 'JavaScript',
          stars: 0,
          isPrivate: false,
          status: 'ready',
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch {}

    // 1. Open app, authenticate, navigate to repo editor
    await loginE2E(page);
    await page.goto(`http://localhost:3000/#repository-editor:${repoId}`);

    // 2. Submit a chat message to create a session
    const chatInput = page.locator('#ai-chat-input');
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    await chatInput.fill('Task session before page reload');

    const sendBtn = page.locator('#ai-send-btn');
    await sendBtn.click();

    // Wait for message bubble to appear in chat
    await expect(page.locator('text=Task session before page reload').first()).toBeVisible({ timeout: 10000 });

    // 3. Click "Start New Task / Chat" button to archive session to DB
    const newChatBtn = page.locator('button[title="Start New Task / Chat"]');
    await expect(newChatBtn).toBeVisible();
    const savePromise = page.waitForResponse(resp => resp.url().includes('/chat-sessions') && resp.status() === 200);
    await newChatBtn.click();
    await savePromise;

    // Verify current chat window is cleared
    await expect(page.locator('text=Task session before page reload')).toHaveCount(0, { timeout: 5000 });

    // 4. PERFORM REAL BROWSER PAGE RELOAD
    console.log('--- EXECUTING REAL BROWSER page.reload() ---');
    await page.reload();
    await loginE2E(page);
    await page.goto(`http://localhost:3000/#repository-editor:${repoId}`);

    // 5. Open Task History drawer in UI after page reload
    const historyBtn = page.locator('button[title="Task History"]');
    await expect(historyBtn).toBeVisible({ timeout: 15000 });
    await historyBtn.click();

    // 6. Assert "Saved Task Sessions" drawer opens and contains the archived session
    await expect(page.locator('text=Saved Task Sessions')).toBeVisible({ timeout: 15000 });
    const savedSessionItem = page.locator('text=Task session before page reload').first();
    await expect(savedSessionItem).toBeVisible({ timeout: 15000 });

    // 7. Click saved session to restore chat messages in UI after page reload
    await savedSessionItem.click();
    await expect(page.locator('text=Task session before page reload').first()).toBeVisible({ timeout: 15000 });

    console.log('--- BUG-019 REAL BROWSER RELOAD VERIFICATION SUCCESSFUL ---');

    // Cleanup
    try {
      await prisma.repository.delete({ where: { id: repoId } });
      rmSync(repoPath, { recursive: true, force: true, maxRetries: 5 });
    } catch {}
  });
});
