import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { randomUUID } from 'crypto';

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

export async function GET(request: NextRequest) {
  try {
    const repos = await prisma.repository.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(repos.map(formatRepository));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch repositories', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, url, description, language, status } = body;
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
    return NextResponse.json(formatRepository(repo));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message || 'Failed to create repository' }, { status: 500 });
  }
}
