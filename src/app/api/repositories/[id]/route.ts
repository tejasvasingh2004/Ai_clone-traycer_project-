import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { rm } from 'fs/promises';
import { join, resolve } from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.repository.delete({ where: { id } });
    
    // Remove local clone directory if it exists
    const rootDir = process.cwd();
    const repoPath = join(rootDir, 'repositories', id);
    await rm(repoPath, { recursive: true, force: true });
    
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    if (e.code === 'P2025') { // record not found
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
