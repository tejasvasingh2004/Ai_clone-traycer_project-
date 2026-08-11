/**
 * Repository-related endpoints using Prisma and returning snake_case responses
 */

import { Router, Request, Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import prisma from '../../src/db.ts';

const router = Router();
const execFileAsync = promisify(execFile);

/**
 * Format Prisma Repository object into the snake_case contract expected by the frontend
 */
function formatRepository(repo: any) {
  if (!repo) return null;
  return {
    id: repo.id,
    workspace_id: repo.workspaceId,
    name: repo.name,
    url: repo.url,
    github_id: repo.githubId,
    description: repo.description || '',
    language: repo.language || '',
    stars: repo.stars ?? 0,
    is_private: repo.isPrivate ?? false,
    status: repo.status,
    created_at: repo.createdAt instanceof Date ? repo.createdAt.toISOString() : repo.createdAt,
    updated_at: repo.updatedAt instanceof Date ? repo.updatedAt.toISOString() : repo.updatedAt,
  };
}

/**
 * GET /api/repositories
 * List all repositories from the database
 */
router.get('/repositories', async (req: Request, res: Response) => {
  try {
    const repos = await prisma.repository.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(repos.map(formatRepository));
  } catch (e: any) {
    console.error('GET REPOSITORIES ERROR:', e);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

/**
 * POST /api/repositories
 * Directly register a repository record in the database
 */
router.post('/repositories', async (req: Request, res: Response) => {
  try {
    const { id, name, url, description, language, status } = req.body;
    const now = new Date().toISOString();

    await prisma.workspace.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', name: 'Default Workspace', description: 'Default' },
    });

    const repo = await prisma.repository.create({
      data: {
        id: id || randomUUID(),
        workspaceId: 'default',
        name: name || 'repository',
        url: url || '',
        description: description || 'Repository',
        language: language || 'Unknown',
        stars: 0,
        isPrivate: false,
        status: status || 'ready',
        createdAt: now,
        updatedAt: now,
      },
    });
    res.json(formatRepository(repo));
  } catch (e: any) {
    console.error('POST REPOSITORIES ERROR:', e);
    res.status(500).json({ error: e.message || 'Failed to create repository' });
  }
});

/**
 * POST /api/import
 * Clone a repository and store metadata in the database
 */
router.post('/import', async (req: Request, res: Response) => {
  let cloneDirectory: string | null = null;
  try {
    let { url } = req.body;
    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'url is required' });
    }

    const normalizedUrl = normalizeRepositoryUrl(url);
    if (!isValidRepositoryUrl(normalizedUrl)) {
      return res.status(400).json({ error: 'url is required and must be a valid repository URL' });
    }

    // Check if repository with this URL has already been imported
    const existingRepo = await prisma.repository.findFirst({
      where: { url: normalizedUrl },
    });
    if (existingRepo) {
      return res.status(400).json({ error: 'A repository with this URL has already been imported' });
    }

    const repositoryId = randomUUID();
    cloneDirectory = join('repositories', repositoryId);

    // Ensure target repositories root folder exists
    await mkdir('repositories', { recursive: true });

    // Execute git clone non-interactively (prevent hanging on password/ssh prompts and parent git env contamination)
    const cloneEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
    delete cloneEnv.GIT_DIR;
    delete cloneEnv.GIT_WORK_TREE;
    delete cloneEnv.GIT_INDEX_FILE;

    await execFileAsync('git', ['clone', normalizedUrl, cloneDirectory], {
      env: cloneEnv,
    });

    const now = new Date().toISOString();
    const repoMeta = {
      id: repositoryId,
      workspaceId: 'default', // placeholder – adjust if workspace handling is added later
      name: getRepositoryName(normalizedUrl),
      url: normalizedUrl,
      githubId: null,
      description: 'Imported repository',
      language: 'Unknown',
      stars: 0,
      isPrivate: false,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
    } as any;

    await prisma.workspace.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        name: 'Default Workspace',
        description: 'Automatically created default workspace',
      },
    });

    const createdRepo = await prisma.repository.create({ data: repoMeta });
    res.json(formatRepository(createdRepo));
  } catch (error: any) {
    console.error('IMPORT ROUTE ERROR:', error);
    // Clean up cloned folder if something failed downstream
    if (cloneDirectory) {
      await rm(cloneDirectory, { recursive: true, force: true }).catch(() => {});
    }

    if (error && error.code === 'P2002') {
      return res.status(400).json({ error: 'A repository with this URL has already been imported' });
    }

    const message = formatImportError(error);
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/repositories/:id
 * Remove a repository both from DB and file system
 */
router.delete('/repositories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.repository.delete({ where: { id } });
    // Remove local clone directory if it exists
    const repoPath = join('repositories', id);
    await rm(repoPath, { recursive: true, force: true });
    res.json({ success: true, id });
  } catch (e: any) {
    if (e.code === 'P2025') { // record not found
      return res.status(404).json({ error: 'Repository not found' });
    }
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/** Helper functions */
function normalizeRepositoryUrl(url: string): string {
  let trimmed = url.trim();
  if (trimmed.startsWith('github.com/') || trimmed.startsWith('gitlab.com/') || trimmed.startsWith('bitbucket.org/')) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

function isValidRepositoryUrl(url: string): boolean {
  if (!url || url.includes(' ')) return false;
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:', 'ssh:', 'file:'].includes(parsedUrl.protocol);
  } catch {
    return /^git@[^\s:]+:[^\s]+$/.test(url) || url.endsWith('.git');
  }
}

/** Build a full, non-truncated import error message from git clone failures. */
function formatImportError(error: unknown): string {
  const err = error as { message?: string; stderr?: string; stdout?: string };
  const parts = [err.message, err.stderr, err.stdout].filter(Boolean).map(String);
  const combined = parts.join('\n').trim();

  if (!combined) return 'Failed to clone repository: unknown error';

  if (combined.includes('Could not read from remote repository') || combined.includes('Authentication failed')) {
    return `Failed to clone repository: authentication required or repository not found.\n\nDetails:\n${combined}`;
  }
  if (combined.includes('destination path') && combined.includes('already exists')) {
    return `Failed to clone repository: destination directory already exists.\n\nDetails:\n${combined}`;
  }
  if (combined.includes('Repository not found') || combined.includes('404')) {
    return `Failed to clone repository: remote repository not found.\n\nDetails:\n${combined}`;
  }

  return `Failed to clone repository.\n\nDetails:\n${combined}`;
}

function getRepositoryName(url: string): string {
  const trimmedUrl = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
  try {
    const parsedUrl = new URL(trimmedUrl);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || parsedUrl.hostname;
  } catch {
    const segments = trimmedUrl.split(/[/:]/).filter(Boolean);
    return segments[segments.length - 1] || 'repository';
  }
}

export default router;
