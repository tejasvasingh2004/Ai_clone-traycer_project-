import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { getSafePath } from '@/lib/repositoryHelper';
import { resolve } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filePath: string[] }> }
) {
  try {
    const { id, filePath } = await params;
    const relativePath = filePath.join('/');
    
    const fullPath = getSafePath(id, relativePath);
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    const content = await readFile(fullPath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to read file content' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filePath: string[] }> }
) {
  try {
    const { id, filePath } = await params;
    const body = await request.json();
    const { content } = body;

    if (content === undefined) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const relativePath = filePath.join('/');
    const fullPath = getSafePath(id, relativePath);
    
    await writeFile(fullPath, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to write file content' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filePath: string[] }> }
) {
  return POST(request, { params });
}
