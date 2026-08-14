import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { rm, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { normalizeRepositoryUrl, isValidRepositoryUrl, getRepositoryName, formatImportError } from '@/lib/repositoryHelper';

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  let cloneDirectory: string | null = null;
  try {
    const body = await request.json();
    const { url } = body;

    if (typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const normalizedUrl = normalizeRepositoryUrl(url);
    if (!isValidRepositoryUrl(normalizedUrl)) {
      return NextResponse.json({ error: 'url is required and must be a valid repository URL' }, { status: 400 });
    }

    // Check if repository with this URL has already been imported
    const existingRepo = await prisma.repository.findFirst({
      where: { url: normalizedUrl },
    });
    if (existingRepo) {
      return NextResponse.json({ error: 'A repository with this URL has already been imported' }, { status: 400 });
    }

    const repositoryId = randomUUID();
    
    const rootDir = process.cwd();
    const repositoriesDir = join(rootDir, 'repositories');
    cloneDirectory = join(repositoriesDir, repositoryId);

    // Ensure target repositories root folder exists
    await mkdir(repositoriesDir, { recursive: true });

    // Execute git clone non-interactively
    const cloneEnv: Record<string, string | undefined> = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
    delete cloneEnv.GIT_DIR;
    delete cloneEnv.GIT_WORK_TREE;
    delete cloneEnv.GIT_INDEX_FILE;

    await execFileAsync('git', ['clone', normalizedUrl, cloneDirectory], {
      env: cloneEnv as NodeJS.ProcessEnv,
    });

    const now = new Date().toISOString();
    const repoMeta = {
      id: repositoryId,
      workspaceId: 'default',
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
    
    // Format the created repo like the GET /api/repositories output
    const formattedRepo = {
      id: createdRepo.id,
      workspace_id: createdRepo.workspaceId,
      name: createdRepo.name,
      url: createdRepo.url,
      github_id: createdRepo.githubId,
      description: createdRepo.description || '',
      language: createdRepo.language || '',
      stars: createdRepo.stars ?? 0,
      is_private: createdRepo.isPrivate ?? false,
      status: createdRepo.status,
      created_at: createdRepo.createdAt instanceof Date ? createdRepo.createdAt.toISOString() : createdRepo.createdAt,
      updated_at: createdRepo.updatedAt instanceof Date ? createdRepo.updatedAt.toISOString() : createdRepo.updatedAt,
    };
    
    return NextResponse.json(formattedRepo);
  } catch (error: any) {
    console.error('IMPORT ROUTE ERROR:', error);
    // Clean up cloned folder if something failed downstream
    if (cloneDirectory) {
      await rm(cloneDirectory, { recursive: true, force: true }).catch(() => {});
    }

    if (error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A repository with this URL has already been imported' }, { status: 400 });
    }

    const message = formatImportError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
