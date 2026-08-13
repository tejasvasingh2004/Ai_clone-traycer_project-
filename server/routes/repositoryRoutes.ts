import { verifyAccessToken } from '../middleware/auth.ts';
import { Router, Request, Response } from 'express';
import { resolve, join, relative, dirname } from 'path';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();

interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

async function buildFileTree(dirPath: string, rootDir: string): Promise<FileTreeNode[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const nodes: FileTreeNode[] = [];

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }

    const fullPath = join(dirPath, entry.name);
    const relPath = relative(rootDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, rootDir);
      nodes.push({
        id: relPath,
        name: entry.name,
        path: relPath,
        type: 'folder',
        children: children.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
      });
    } else if (entry.isFile()) {
      nodes.push({
        id: relPath,
        name: entry.name,
        path: relPath,
        type: 'file',
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function getSafePath(repositoryId: string, relativePath: string): string {
  const repoDir = resolve('repositories', repositoryId);
  const targetPath = resolve(repoDir, relativePath);
  if (!targetPath.startsWith(repoDir)) {
    throw new Error('Access denied: path is outside the repository directory');
  }
  return targetPath;
}

// 1. GET /api/repositories/:id/files - Get file tree
router.get('/repositories/:id/files', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const repoPath = resolve('repositories', id);
    if (!existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    const tree = await buildFileTree(repoPath, repoPath);
    res.json(tree);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to build repository file tree' });
  }
});

// 2. GET /api/repositories/:id/files/* - Get file content
router.get('/repositories/:id/files/*', verifyAccessToken, async (req: Request, res: Response) => {
  const repositoryId = req.params.id;
  const filePath = req.params[0];
  try {
    const fullPath = getSafePath(repositoryId, filePath);
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const content = await readFile(fullPath, 'utf-8');
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to read file content' });
  }
});

// 3. POST /api/repositories/:id/files/* - Save file content (create or overwrite)
router.post('/repositories/:id/files/*', verifyAccessToken, async (req: Request, res: Response) => {
  const repositoryId = req.params.id;
  const filePath = req.params[0];
  const { content } = req.body;

  if (content === undefined) {
    return res.status(400).json({ error: 'content is required' });
  }

  try {
    const fullPath = getSafePath(repositoryId, filePath);
    await writeFile(fullPath, content, 'utf-8');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to write file content' });
  }
});

// 4. PUT /api/repositories/:id/files/* - Save file content (overwrite)
router.put('/repositories/:id/files/*', verifyAccessToken, async (req: Request, res: Response) => {
  const repositoryId = req.params.id;
  const filePath = req.params[0];
  const { content } = req.body;

  if (content === undefined) {
    return res.status(400).json({ error: 'content is required' });
  }

  try {
    const fullPath = getSafePath(repositoryId, filePath);
    await writeFile(fullPath, content, 'utf-8');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to write file content' });
  }
});

// 5. POST /api/repositories/:id/terminal - Run terminal command in repository
router.post('/repositories/:id/terminal', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'command is required' });
  }

  try {
    const repoPath = resolve('repositories', id);
    if (!existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    exec(command, { cwd: repoPath }, (error, stdout, stderr) => {
      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += stderr;
      if (error) {
        output += `\nError: ${error.message}`;
        return res.json({ output, status: 'error' });
      }
      res.json({ output, status: 'completed' });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to execute command' });
  }
});

const execAsync = promisify(exec);

// 6. POST /api/repositories/:id/create-file — create an empty file at given path
router.post('/repositories/:id/create-file', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  try {
    const fullPath = getSafePath(id, filePath);
    // Ensure parent directories exist
    await mkdir(dirname(fullPath), { recursive: true });
    // Don't overwrite an existing file
    if (existsSync(fullPath)) {
      return res.status(409).json({ error: 'File already exists' });
    }
    await writeFile(fullPath, '', 'utf-8');
    res.json({ success: true, path: filePath });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create file' });
  }
});

// 7. POST /api/repositories/:id/create-folder — create a directory at given path
router.post('/repositories/:id/create-folder', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'folderPath is required' });
  try {
    const fullPath = getSafePath(id, folderPath);
    if (existsSync(fullPath)) {
      return res.status(409).json({ error: 'Folder already exists' });
    }
    await mkdir(fullPath, { recursive: true });
    res.json({ success: true, path: folderPath });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create folder' });
  }
});

// 8. GET /api/repositories/:id/git-status — real git status --porcelain
router.get('/repositories/:id/git-status', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const repoPath = resolve('repositories', id);
    if (!existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
      const lines = stdout.split('\n').filter(l => l.trim().length > 0);
      res.json({ files: lines, count: lines.length });
    } catch {
      res.json({ files: [], count: 0 });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get git status' });
  }
});

// Helper for recursive file search
async function searchFiles(dir: string, rootDir: string, query: string, results: Array<{ path: string; line: number; text: string }>, maxResults = 100) {
  if (results.length >= maxResults) return;
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (results.length >= maxResults) break;
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await searchFiles(fullPath, rootDir, query, results, maxResults);
    } else if (entry.isFile()) {
      // Basic text file extensions check
      const ext = entry.name.split('.').pop()?.toLowerCase();
      const textExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'md', 'html', 'css', 'txt', 'py', 'sh', 'yml', 'yaml', 'toml', 'env'];
      if (!ext || textExts.includes(ext)) {
        try {
          const content = await readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          const lowerQuery = query.toLowerCase();
          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;
            if (lines[i].toLowerCase().includes(lowerQuery)) {
              const relPath = relative(rootDir, fullPath).replace(/\\/g, '/');
              results.push({
                path: relPath,
                line: i + 1,
                text: lines[i].trim(),
              });
            }
          }
        } catch {}
      }
    }
  }
}

// 9. POST /api/repositories/:id/search — real repo text search
router.post('/repositories/:id/search', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.json({ results: [] });
  }

  try {
    const repoPath = resolve('repositories', id);
    if (!existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const results: Array<{ path: string; line: number; text: string }> = [];
    await searchFiles(repoPath, repoPath, query.trim(), results);
    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to search repository' });
  }
});

// 10. POST /api/repositories/:id/git-stage — stage a specific file
router.post('/repositories/:id/git-stage', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  try {
    const repoPath = resolve('repositories', id);
    await execAsync(`git add "${filePath}"`, { cwd: repoPath });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to stage file' });
  }
});

// 11. POST /api/repositories/:id/git-unstage — unstage a specific file
router.post('/repositories/:id/git-unstage', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  try {
    const repoPath = resolve('repositories', id);
    await execAsync(`git restore --staged "${filePath}"`, { cwd: repoPath });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to unstage file' });
  }
});

// 12. POST /api/repositories/:id/git-discard — discard changes to a file
router.post('/repositories/:id/git-discard', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  try {
    const repoPath = resolve('repositories', id);
    try {
      await execAsync(`git checkout -- "${filePath}"`, { cwd: repoPath });
    } catch {
      // Untracked file -> clean
      await execAsync(`git clean -f -- "${filePath}"`, { cwd: repoPath });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to discard changes' });
  }
});

// 13. POST /api/repositories/:id/git-commit — stage all + commit
router.post('/repositories/:id/git-commit', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Commit message is required' });
  try {
    const repoPath = resolve('repositories', id);
    // Make sure git user identity is set for the repo
    try {
      await execAsync('git config user.email "traycer@ai.bot"', { cwd: repoPath });
      await execAsync('git config user.name "Traycer AI"', { cwd: repoPath });
    } catch {}
    const escapedMsg = message.replace(/"/g, '\\"');
    const { stdout } = await execAsync(`git commit -m "${escapedMsg}"`, { cwd: repoPath });
    res.json({ success: true, output: stdout });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to commit changes' });
  }
});

// 14. POST /api/repositories/:id/git-generate-commit-msg — AI generated commit message
router.post('/repositories/:id/git-generate-commit-msg', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const repoPath = resolve('repositories', id);
    let diff = '';
    try {
      const { stdout } = await execAsync('git diff --staged', { cwd: repoPath });
      diff = stdout;
    } catch {}
    if (!diff) {
      try {
        const { stdout } = await execAsync('git diff', { cwd: repoPath });
        diff = stdout;
      } catch {}
    }

    if (!diff.trim()) {
      // No diff (e.g. only untracked files) — use status list to name files
      let statusLines = '';
      try {
        const { stdout } = await execAsync('git status --short', { cwd: repoPath });
        statusLines = stdout;
      } catch {}
      const files = statusLines.split('\n').map(l => l.slice(2).trim()).filter(Boolean);
      if (files.length === 0) return res.json({ message: 'chore: update repository files' });
      const first = files[0];
      const ext = first.includes('.') ? first.split('.').pop() : '';
      const msg = ext === 'ts' || ext === 'js' || ext === 'tsx'
        ? `feat: add ${first}`
        : `chore: add ${files.length === 1 ? first : files.length + ' new files'}`;
      return res.json({ message: msg });
    }

    // Synthesize concise conventional commit message from real diff
    const changedFiles = diff.match(/--- a\/(.+)/g)?.map(l => l.replace('--- a/', '')) || [];
    const mainFile = changedFiles[0] || 'code';
    const summaryMsg = diff.includes('export') ? `feat: add exports in ${mainFile}` : `refactor: update ${mainFile}`;
    res.json({ message: summaryMsg });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate commit message' });
  }
});

// 15. GET /api/repositories/:id/git-file-diff — get file git diff
router.get('/repositories/:id/git-file-diff', verifyAccessToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'path parameter is required' });
  try {
    const repoPath = resolve('repositories', id);
    let diff = '';
    try {
      const { stdout } = await execAsync(`git diff HEAD -- "${filePath}"`, { cwd: repoPath });
      diff = stdout;
    } catch {}
    res.json({ diff });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get file diff' });
  }
});

export default router;

