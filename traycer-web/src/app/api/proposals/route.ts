import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { StagedProposal } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const dbProposals = await prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const proposals: StagedProposal[] = dbProposals.map(p => ({
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
    }));

    return NextResponse.json(proposals);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
