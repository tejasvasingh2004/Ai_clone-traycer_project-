import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { STAGING_DIR, STAGING_INDEX_FILE } from '@/lib/config';
import { unlink, writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Transactionally validate and update the proposal
    await prisma.$transaction(async (tx) => {
      // Verify proposal exists and is approved
      const proposal = await tx.proposal.findUnique({ where: { id } });
      if (!proposal) {
        throw Object.assign(new Error('Proposal not found'), { status: 404 });
      }
      if (!proposal.approved) {
        throw Object.assign(new Error('Proposal is not approved/deployed'), { status: 400 });
      }

      // Rollback filesystem content (outside DB but still within transaction scope)
      const filePath = proposal.filePath;
      if (proposal.operation === 'create') {
        try { await unlink(filePath); } catch {}
      } else {
        if (proposal.originalContent !== null) {
          await writeFile(filePath, proposal.originalContent, 'utf-8');
        } else {
          throw Object.assign(new Error('Original content not captured, cannot rollback'), { status: 400 });
        }
      }

      // Update proposal to not approved
      await tx.proposal.update({
        where: { id },
        data: { approved: false }
      });
    });

    // Mirror to staging filesystem JSON file (outside transaction)
    try {
      const proposalPath = join(STAGING_DIR, `${id}.json`);
      const content = await readFile(proposalPath, 'utf-8');
      const prop = JSON.parse(content);
      prop.approved = false;
      await writeFile(proposalPath, JSON.stringify(prop, null, 2), 'utf-8');

      // Update staging index.json
      const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
      const indexData = JSON.parse(indexContent);
      const indexEntry = indexData.find((e: any) => e.id === id);
      if (indexEntry) {
        indexEntry.approved = false;
        await writeFile(STAGING_INDEX_FILE, JSON.stringify(indexData, null, 2), 'utf-8');
      }
    } catch (e) {
      console.error('Error updating staging files on rollback:', e);
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const status = (error as any).status || 500;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
