import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { approveProposal } from '@/lib/approver';
import { resolve } from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { repositoryId } = body;
    
    const repoDir = resolve(process.cwd(), '..', 'repositories');
    const projectRoot = repositoryId && repositoryId !== 'default' 
      ? resolve(repoDir, repositoryId) 
      : resolve(process.cwd(), '..');

    await approveProposal(id, true, projectRoot); // Skip confirmation

    // Update approval status directly in DB for this proposal
    await prisma.proposal.update({
      where: { id },
      data: { approved: true },
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') || message.includes('Proposal not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
