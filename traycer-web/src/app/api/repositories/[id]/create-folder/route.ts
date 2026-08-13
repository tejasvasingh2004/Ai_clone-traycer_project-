import { NextRequest, NextResponse } from 'next/server';
import { getSafePath } from '@/lib/repositoryHelper';
import { resolve } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { folderPath } = body;
    
    if (!folderPath) {
      return NextResponse.json({ error: 'folderPath is required' }, { status: 400 });
    }

    const fullPath = getSafePath(id, folderPath);
    
    if (existsSync(fullPath)) {
      return NextResponse.json({ error: 'Folder already exists' }, { status: 409 });
    }
    
    await mkdir(fullPath, { recursive: true });
    return NextResponse.json({ success: true, path: folderPath });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create folder' }, { status: 500 });
  }
}
