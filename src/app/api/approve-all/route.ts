import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { approveAll } from '@/lib/approver';
import { syncStagingToDb } from '@/lib/stagingSync';
import { resolve } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { repositoryId } = body;
    
    const repoDir = resolve(process.cwd(), 'repositories');
    const projectRoot = repositoryId && repositoryId !== 'default' 
      ? resolve(repoDir, repositoryId) 
      : process.cwd();

    const results = await approveAll(projectRoot);

    // Sync staging filesystem → DB so approved flags and deleted ops are reflected
    await syncStagingToDb();

    // Mark successfully applied proposals as approved in DB (staging sync may miss deleted files still in index)
    for (const r of results.success) {
      await prisma.proposal.updateMany({
        where: { filePath: r.filePath, approved: false },
        data: { approved: true },
      });
    }

    const successFiles = results.success.map(r => r.filePath);
    const failedFiles = results.failed.map(r => r.filePath);
    const deletedFiles = results.success.filter(r => r.operation === 'delete').map(r => r.filePath);
    const modifiedFiles = results.success.filter(r => r.operation !== 'delete').map(r => r.filePath);

    const approvedProposals = await prisma.proposal.findMany({
      where: { filePath: { in: successFiles }, approved: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: results.failed.length === 0,
      approved: results.success.length,
      failed: results.failed.length,
      files: successFiles,
      deleted: deletedFiles,
      modified: modifiedFiles,
      failures: results.failed.map(r => ({ filePath: r.filePath, error: r.error || 'unknown' })),
      proposals: approvedProposals.map(p => ({
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
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
