import { NextRequest, NextResponse } from 'next/server';
import { searchFiles } from '@/lib/repositoryHelper';
import { resolve } from 'path';
import { existsSync } from 'fs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ results: [] });
    }

    const projectRoot = resolve(process.cwd(), '..');
    const repoPath = resolve(projectRoot, 'repositories', id);
    
    if (!existsSync(repoPath)) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    const results: Array<{ path: string; line: number; text: string }> = [];
    await searchFiles(repoPath, repoPath, query.trim(), results);
    
    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to search repository' }, { status: 500 });
  }
}
