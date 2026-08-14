import { NextRequest, NextResponse } from 'next/server';
import { getSafePath } from '@/lib/repositoryHelper';
import { dirname, resolve } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { filePath } = body;
    
    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    const fullPath = getSafePath(id, filePath);
    
    // Ensure parent directories exist
    await mkdir(dirname(fullPath), { recursive: true });
    
    // Don't overwrite an existing file
    if (existsSync(fullPath)) {
      return NextResponse.json({ error: 'File already exists' }, { status: 409 });
    }
    
    await writeFile(fullPath, '', 'utf-8');
    return NextResponse.json({ success: true, path: filePath });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create file' }, { status: 500 });
  }
}
