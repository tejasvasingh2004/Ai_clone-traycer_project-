/**
 * Repository-related endpoints
 */

import { Router, Request, Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

const router = Router();
const execFileAsync = promisify(execFile);

function isValidRepositoryUrl(url: unknown): url is string {
	if (typeof url !== 'string') {
		return false;
	}

	const trimmedUrl = url.trim();
	if (!trimmedUrl || trimmedUrl.includes(' ')) {
		return false;
	}

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

/**
 * POST /api/import
 * Clone a repository into a temporary local directory
 */
router.post('/import', async (req: Request, res: Response) => {
	try {
		const { url } = req.body;

		if (!isValidRepositoryUrl(url)) {
			return res.status(400).json({ error: 'url is required and must be a valid repository URL' });
		}

		const repositoryId = randomUUID();
		const cloneDirectory = await mkdtemp(join(tmpdir(), 'traycer-repo-'));
		const normalizedUrl = url.trim();

		await execFileAsync('git', ['clone', normalizedUrl, cloneDirectory]);

		const now = new Date().toISOString();
		res.json({
			id: repositoryId,
			workspace_id: 'default',
			name: getRepositoryName(normalizedUrl),
			url: normalizedUrl,
			github_id: null,
			description: 'Imported repository',
			language: 'Unknown',
			stars: 0,
			is_private: false,
			status: 'ready',
			created_at: now,
			updated_at: now,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		res.status(500).json({ error: message });
	}
});

export default router;
