# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui_controls.spec.ts >> Browser UI Controls Verification: Explorer, Source Control, Activity Bar, Terminal >> Complete Browser UI Interaction Test Suite
- Location: tests\e2e\ui_controls.spec.ts:12:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#source-control-file-list')
Expected substring: "No changes detected in working tree"
Received string:    "outside_terminal_file.txt??ui_created_file.ts??"
Timeout: 10000ms

Call log:
  - Expect "toContainText" with timeout 10000ms
  - waiting for locator('#source-control-file-list')
    24 × locator resolved to <div id="source-control-file-list" class="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">…</div>
       - unexpected value "outside_terminal_file.txt??ui_created_file.ts??"

```

```yaml
- text: outside_terminal_file.txt ??
- button "Stage Changes (+)":
  - img
- button "Discard Changes":
  - img
- text: ui_created_file.ts ??
- button "Stage Changes (+)":
  - img
- button "Discard Changes":
  - img
```

# Test source

```ts
  45  |     await expect(page.locator('body')).toBeVisible();
  46  | 
  47  |     const reposBtn = page.getByRole('button', { name: 'Repositories' }).first();
  48  |     await reposBtn.click();
  49  | 
  50  |     const repoCard = page.locator('text=e2e_ui_controls_repo').first();
  51  |     await expect(repoCard).toBeVisible({ timeout: 15000 });
  52  |     await repoCard.click();
  53  | 
  54  |     // Verify Repository Editor opened
  55  |     await expect(page.locator('text=Explorer')).toBeVisible({ timeout: 15000 });
  56  | 
  57  |     // ── 2. NEW FILE CONTROL VIA BROWSER UI ──
  58  |     const newFileBtn = page.locator('#explorer-new-file-btn');
  59  |     await expect(newFileBtn).toBeVisible();
  60  |     await newFileBtn.click();
  61  | 
  62  |     // Type filename into inline overlay input
  63  |     const fileOverlayInput = page.getByPlaceholder('filename.ts');
  64  |     await expect(fileOverlayInput).toBeVisible();
  65  |     await fileOverlayInput.fill('ui_created_file.ts');
  66  |     await fileOverlayInput.press('Enter');
  67  | 
  68  |     // Assert file appears in DOM tree immediately
  69  |     const createdFileNode = page.locator('text=ui_created_file.ts').first();
  70  |     await expect(createdFileNode).toBeVisible({ timeout: 5000 });
  71  | 
  72  |     // Independently confirm file exists on disk
  73  |     const diskFilePath = resolve(repoPath, 'ui_created_file.ts');
  74  |     expect(existsSync(diskFilePath)).toBe(true);
  75  | 
  76  |     // ── 3. NEW FOLDER CONTROL VIA BROWSER UI ──
  77  |     const newFolderBtn = page.locator('#explorer-new-folder-btn');
  78  |     await expect(newFolderBtn).toBeVisible();
  79  |     await newFolderBtn.click();
  80  | 
  81  |     const folderOverlayInput = page.getByPlaceholder('folder-name');
  82  |     await expect(folderOverlayInput).toBeVisible();
  83  |     await folderOverlayInput.fill('ui_created_dir');
  84  |     await folderOverlayInput.press('Enter');
  85  | 
  86  |     // Assert folder node appears in DOM tree
  87  |     const createdFolderNode = page.locator('text=ui_created_dir').first();
  88  |     await expect(createdFolderNode).toBeVisible({ timeout: 5000 });
  89  | 
  90  |     // Independently confirm directory exists on disk
  91  |     const diskFolderPath = resolve(repoPath, 'ui_created_dir');
  92  |     expect(existsSync(diskFolderPath)).toBe(true);
  93  | 
  94  |     // ── 4. REFRESH EXPLORER CONTROL VIA BROWSER UI ──
  95  |     // Create an out-of-band file on disk (bypassing UI)
  96  |     const outOfBandPath = resolve(repoPath, 'outside_terminal_file.txt');
  97  |     writeFileSync(outOfBandPath, 'created directly on disk', 'utf-8');
  98  | 
  99  |     // Click Refresh button in explorer header
  100 |     const refreshBtn = page.locator('#explorer-refresh-btn');
  101 |     await refreshBtn.click();
  102 | 
  103 |     // Assert out-of-band file appears in tree without page reload
  104 |     const outOfBandNode = page.locator('text=outside_terminal_file.txt').first();
  105 |     await expect(outOfBandNode).toBeVisible({ timeout: 5000 });
  106 | 
  107 |     // ── 5. COLLAPSE ALL CONTROL VIA BROWSER UI ──
  108 |     const collapseBtn = page.locator('#explorer-collapse-btn');
  109 |     await expect(collapseBtn).toBeVisible();
  110 |     await collapseBtn.click();
  111 | 
  112 |     // ── 6. REAL CONTENT SEARCH PANEL VIA BROWSER UI ──
  113 |     const searchTabBtn = page.locator('#activity-bar-search-btn');
  114 |     await searchTabBtn.click();
  115 | 
  116 |     const searchPanel = page.locator('#search-panel');
  117 |     await expect(searchPanel).toBeVisible();
  118 | 
  119 |     const searchBox = page.locator('#search-input-box');
  120 |     await searchBox.fill('created directly on disk');
  121 | 
  122 |     const searchResultItem = page.locator('#search-results-list').locator('text=outside_terminal_file.txt').first();
  123 |     await expect(searchResultItem).toBeVisible({ timeout: 8000 });
  124 | 
  125 |     // ── 7. SOURCE CONTROL COMMIT & AI COMMIT MSG GENERATOR ──
  126 |     const sourceControlTabBtn = page.locator('#activity-bar-source-control-btn');
  127 |     await sourceControlTabBtn.click();
  128 | 
  129 |     const scPanel = page.locator('#source-control-panel');
  130 |     await expect(scPanel).toBeVisible();
  131 |     await expect(page.locator('#source-control-file-list')).toContainText('outside_terminal_file.txt');
  132 | 
  133 |     // Click AI Generate Commit Message button
  134 |     const genCommitMsgBtn = page.locator('#generate-commit-msg-btn');
  135 |     await genCommitMsgBtn.click();
  136 | 
  137 |     const commitMsgInput = page.locator('#commit-message-input');
  138 |     await expect(commitMsgInput).not.toHaveValue('');
  139 | 
  140 |     // Click Commit button
  141 |     const commitSubmitBtn = page.locator('#commit-submit-btn');
  142 |     await commitSubmitBtn.click();
  143 | 
  144 |     // Verify working tree clean
> 145 |     await expect(page.locator('#source-control-file-list')).toContainText('No changes detected in working tree', { timeout: 10000 });
      |                                                             ^ Error: expect(locator).toContainText(expected) failed
  146 | 
  147 |     // ── 8. AI PANEL PLAN, EXECUTE & REVIEW WORKFLOW ──
  148 |     // Click Plan button
  149 |     const planBtn = page.locator('#ai-workflow-plan-btn');
  150 |     await planBtn.click();
  151 | 
  152 |     // Verify Plan output in chat bubble
  153 |     await expect(page.locator('text=PLAN GENERATED').first()).toBeVisible({ timeout: 15000 });
  154 | 
  155 |     // Click Execute button -> Select Execute Generated Plan
  156 |     const executeBtn = page.locator('#ai-workflow-execute-btn');
  157 |     await executeBtn.click();
  158 | 
  159 |     const execPlanOpt = page.locator('#exec-option-plan');
  160 |     await expect(execPlanOpt).toBeVisible();
  161 |     await execPlanOpt.click();
  162 | 
  163 |     await expect(page.locator('text=PLAN EXECUTED SUCCESSFULLY!').first()).toBeVisible({ timeout: 20000 });
  164 | 
  165 |     // Click Review button
  166 |     const reviewBtn = page.locator('#ai-workflow-review-btn');
  167 |     await reviewBtn.click();
  168 | 
  169 |     await expect(page.locator('text=REVIEW REPORT').first()).toBeVisible({ timeout: 10000 });
  170 | 
  171 |     // Clean up repo record and disk directory
  172 |     try {
  173 |       await prisma.repository.delete({ where: { id: repoId } });
  174 |       rmSync(repoPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  175 |     } catch {}
  176 |   });
  177 | });
  178 | 
```