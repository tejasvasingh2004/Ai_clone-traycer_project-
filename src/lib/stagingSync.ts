import { readFile } from 'fs/promises';
import { join } from 'path';
import { STAGING_DIR, STAGING_INDEX_FILE } from './config';
import { StagedProposal } from './types';
import prisma from './db';

/**
 * Synchronize the staging filesystem to the Prisma database
 */
export async function syncStagingToDb(): Promise<void> {
  let indexData: Array<{ id: string; planId: string; filePath: string; createdAt: string }>;

  try {
    const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
    indexData = JSON.parse(indexContent);
  } catch {
    indexData = [];
  }

  const indexIds = indexData.map(e => e.id);

  // Delete database proposals that are no longer in the staging index
  await prisma.proposal.deleteMany({
    where: {
      id: {
        notIn: indexIds,
      },
    },
  });

  // Upsert current staged proposals
  for (const entry of indexData) {
    try {
      const proposalPath = join(STAGING_DIR, `${entry.id}.json`);
      const content = await readFile(proposalPath, 'utf-8');
      const prop: StagedProposal = JSON.parse(content);

      await prisma.proposal.upsert({
        where: { id: prop.id },
        update: {
          planId: prop.planId,
          filePath: prop.filePath,
          newContent: prop.newContent,
          diff: prop.diff,
          operation: prop.operation,
          approved: prop.approved,
          createdAt: new Date(prop.createdAt),
          generationContext: prop.generationContext ? JSON.stringify(prop.generationContext) : null,
          rejectionHistory: prop.rejectionHistory ? JSON.stringify(prop.rejectionHistory) : null,
          originalContent: prop.originalContent || null,
        },
        create: {
          id: prop.id,
          planId: prop.planId,
          filePath: prop.filePath,
          newContent: prop.newContent,
          diff: prop.diff,
          operation: prop.operation,
          approved: prop.approved,
          createdAt: new Date(prop.createdAt),
          generationContext: prop.generationContext ? JSON.stringify(prop.generationContext) : null,
          rejectionHistory: prop.rejectionHistory ? JSON.stringify(prop.rejectionHistory) : null,
          originalContent: prop.originalContent || null,
        },
      });
    } catch (err) {
      console.error(`Error syncing staging entry ${entry.id} to DB:`, err);
    }
  }
}
