import { resolve, join, relative, dirname } from 'path';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

export function normalizeRepositoryUrl(url: string): string {
  let trimmed = url.trim();
  if (trimmed.startsWith('github.com/') || trimmed.startsWith('gitlab.com/') || trimmed.startsWith('bitbucket.org/')) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

export function isValidRepositoryUrl(url: string): boolean {
  if (!url || url.includes(' ')) return false;
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:', 'ssh:', 'file:'].includes(parsedUrl.protocol);
  } catch {
    return /^git@[^\s:]+:[^\s]+$/.test(url) || url.endsWith('.git');
  }
}

export function formatImportError(error: unknown): string {
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

export function getRepositoryName(url: string): string {
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

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

export async function buildFileTree(dirPath: string, rootDir: string): Promise<FileTreeNode[]> {
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

export function getSafePath(repositoryId: string, relativePath: string, projectRoot: string = process.cwd()): string {
  const repoDir = resolve(projectRoot, '..', 'repositories', repositoryId);
  const targetPath = resolve(repoDir, relativePath);
  if (!targetPath.startsWith(repoDir)) {
    throw new Error('Access denied: path is outside the repository directory');
  }
  return targetPath;
}

export async function searchFiles(dir: string, rootDir: string, query: string, results: Array<{ path: string; line: number; text: string }>, maxResults = 100) {
  if (results.length >= maxResults) return;
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (results.length >= maxResults) break;
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await searchFiles(fullPath, rootDir, query, results, maxResults);
    } else if (entry.isFile()) {
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
