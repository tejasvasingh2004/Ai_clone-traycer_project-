import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { buildFileTree } from '@/lib/repositoryHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectRoot = process.cwd();
    const repoPath = resolve(projectRoot, 'repositories', id);
    
    if (!existsSync(repoPath)) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    
    const tree = await buildFileTree(repoPath, repoPath);
    return NextResponse.json(tree);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to build repository file tree' }, { status: 500 });
  }
}
