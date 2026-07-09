import { Router, Request, Response } from 'express';
import { resolve, join, relative } from 'path';
import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { exec } from 'child_process';

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
router.get('/repositories/:id/files', async (req: Request, res: Response) => {
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
router.get('/repositories/:id/files/*', async (req: Request, res: Response) => {
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
router.post('/repositories/:id/files/*', async (req: Request, res: Response) => {
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
router.put('/repositories/:id/files/*', async (req: Request, res: Response) => {
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
router.post('/repositories/:id/terminal', async (req: Request, res: Response) => {
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

export default router;
