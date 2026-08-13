import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { StagedProposal } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const p = await prisma.proposal.findUnique({
      where: { id },
    });

    if (!p) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal: StagedProposal = {
      id: p.id,
      planId: p.planId,
      filePath: p.filePath,
      newContent: p.newContent,
      diff: p.diff || '',
      operation: p.operation as 'create' | 'modify' | 'delete',
      approved: p.approved,
      createdAt: p.createdAt.toISOString(),
      generationContext: p.generationContext ? JSON.parse(p.generationContext) : undefined,
      rejectionHistory: p.rejectionHistory ? JSON.parse(p.rejectionHistory) : undefined,
      originalContent: p.originalContent || null,
    };

    return NextResponse.json(proposal);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
