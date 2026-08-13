import { NextRequest, NextResponse } from 'next/server';
import { STAGING_DIR, STAGING_INDEX_FILE } from '@/lib/config';
import { syncStagingToDb } from '@/lib/stagingSync';
import { readdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const files = await readdir(STAGING_DIR);

    for (const file of files) {
      if (file.endsWith('.json') && file !== 'index.json') {
        await unlink(join(STAGING_DIR, file));
      }
    }

    // Clear index
    await writeFile(STAGING_INDEX_FILE, '[]', 'utf-8');

    // Sync database with now‑empty staging filesystem
    await syncStagingToDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
