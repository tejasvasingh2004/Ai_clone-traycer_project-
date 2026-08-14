import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { rejectProposal } from '@/lib/reviewer';
import { STAGING_DIR } from '@/lib/config';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const proposal = await prisma.proposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    await rejectProposal(proposal.filePath, reason || 'No reason provided');

    // Update the regenerated proposal in the DB (targeted sync)
    const stagedPath = join(STAGING_DIR, `${id}.json`);
    const stagedContent = await readFile(stagedPath, 'utf-8');
    const stagedProp = JSON.parse(stagedContent);
    
    await prisma.proposal.update({
      where: { id },
      data: {
        newContent: stagedProp.newContent,
        diff: stagedProp.diff,
        generationContext: stagedProp.generationContext ? JSON.stringify(stagedProp.generationContext) : null,
        rejectionHistory: stagedProp.rejectionHistory ? JSON.stringify(stagedProp.rejectionHistory) : null,
        // Preserve other fields (approved etc.) unchanged
      },
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
