/**
 * Repository-related endpoints using Prisma and returning snake_case responses
 */

import { Router, Request, Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { rm } from 'fs/promises';
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
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

/**
 * POST /api/import
 * Clone a repository and store metadata in the database
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!isValidRepositoryUrl(url)) {
      return res.status(400).json({ error: 'url is required and must be a valid repository URL' });
    }

    const repositoryId = randomUUID();
    const cloneDirectory = join('repositories', repositoryId);
    const normalizedUrl = url.trim();

    await execFileAsync('git', ['clone', normalizedUrl, cloneDirectory]);

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

    const createdRepo = await prisma.repository.create({ data: repoMeta });
    res.json(formatRepository(createdRepo));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
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
function isValidRepositoryUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmedUrl = url.trim();
  if (!trimmedUrl || trimmedUrl.includes(' ')) return false;
  try {
    const parsedUrl = new URL(trimmedUrl);
    return ['http:', 'https:', 'ssh:', 'file:'].includes(parsedUrl.protocol);
  } catch {
    return /^git@[^\s:]+:[^\s]+$/.test(trimmedUrl) || trimmedUrl.endsWith('.git');
  }
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
