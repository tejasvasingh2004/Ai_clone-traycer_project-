/**
 * Approval module for Traycer-mini
 * Applies staged code proposals to the actual codebase
 */

import { readFile, writeFile, mkdir, unlink, rm } from 'fs/promises';
import { dirname, join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { StagedProposal } from './types';
import { STAGING_DIR, STAGING_INDEX_FILE } from './config';
import { resolveSafeProjectPath } from './utils/pathUtils';

/**
 * Interface for staging index entries
 */
interface StagingIndexEntry {
  id: string;
  planId: string;
  filePath: string;
  createdAt: string;
  approved: boolean;
}

export interface ApproveResult {
  filePath: string;
  operation: 'create' | 'modify' | 'delete';
  success: boolean;
  error?: string;
}

/**
 * Read the staging index file
 * @returns Array of staging index entries
 */
async function readStagingIndex(): Promise<StagingIndexEntry[]> {
  try {
    const content = await readFile(STAGING_INDEX_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Write the staging index file
 * @param index Array of staging index entries
 */
async function writeStagingIndex(index: StagingIndexEntry[]): Promise<void> {
  await writeFile(STAGING_INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * Find a proposal by file path or proposal ID
 * @param filePathOrProposalId File path or proposal ID to search for
 * @returns Staging index entry if found, null otherwise
 */
async function findProposal(filePathOrProposalId: string): Promise<StagingIndexEntry | null> {
  const index = await readStagingIndex();

  let entry = index.find(e => e.id === filePathOrProposalId);

  if (!entry) {
    const matchingEntries = index.filter(e => e.filePath === filePathOrProposalId);
    if (matchingEntries.length > 0) {
      matchingEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      entry = matchingEntries[0];
    }
  }

  return entry || null;
}

/**
 * Approve and apply a staged code proposal to the codebase
 * @param filePathOrProposalId File path or proposal ID to approve
 * @param skipConfirmation Skip the confirmation prompt (for batch operations)
 */
export async function approveProposal(
  filePathOrProposalId: string,
  skipConfirmation: boolean = false,
  projectRoot: string = process.cwd()
): Promise<ApproveResult> {
  const entry = await findProposal(filePathOrProposalId);

  if (!entry) {
    throw new Error(`Proposal not found: ${filePathOrProposalId}`);
  }

  const proposalPath = join(STAGING_DIR, `${entry.id}.json`);
  let proposal: StagedProposal;

  try {
    const content = await readFile(proposalPath, 'utf-8');
    proposal = JSON.parse(content);
  } catch {
    throw new Error(`Failed to read proposal file: ${proposalPath}`);
  }

  if (!skipConfirmation) {
    const response = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `Apply this change to ${chalk.cyan(proposal.filePath)} (${chalk.yellow(proposal.operation)})?`,
      initial: true,
    });

    if (!response.confirmed) {
      console.log(chalk.yellow('Approval cancelled'));
      return { filePath: proposal.filePath, operation: proposal.operation, success: false, error: 'cancelled' };
    }
  }

  const spinner = ora(
    proposal.operation === 'delete'
      ? `Deleting ${proposal.filePath}...`
      : `Applying changes to ${proposal.filePath}...`
  ).start();

  try {
    const fullTargetPath = resolveSafeProjectPath(projectRoot, proposal.filePath);

    if (proposal.operation === 'delete') {
      let originalContent: string | null = null;
      try {
        originalContent = await readFile(fullTargetPath, 'utf-8');
      } catch (e) {
        // file doesn't exist or isn't readable
      }
      
      try {
        await unlink(fullTargetPath);
      } catch (err: any) {
        if (err?.code === 'ENOENT') {
          throw new Error(`Cannot delete ${proposal.filePath}: file does not exist`);
        }
        if (err?.code === 'EISDIR' || err?.code === 'EPERM') {
          try {
            await rm(fullTargetPath, { recursive: true, force: false });
          } catch (rmErr: any) {
            throw new Error(`Failed to delete ${proposal.filePath}: ${rmErr?.message || err.message}`);
          }
        } else {
          throw new Error(`Failed to delete ${proposal.filePath}: ${err?.message || String(err)}`);
        }
      }
      
      if (originalContent !== null) {
        (proposal as any).originalContent = originalContent;
      }
    } else {
      const targetDir = dirname(fullTargetPath);
      await mkdir(targetDir, { recursive: true });

      let originalContent: string | null = null;
      if (proposal.operation === 'modify') {
        try {
          originalContent = await readFile(fullTargetPath, 'utf-8');
        } catch {}
      }

      await writeFile(fullTargetPath, proposal.newContent, 'utf-8');

      if (originalContent !== null) {
        (proposal as any).originalContent = originalContent;
      }
    }

    proposal.approved = true;
    await writeFile(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8');

    const index = await readStagingIndex();
    const indexEntry = index.find(e => e.id === entry.id);
    if (indexEntry) {
      indexEntry.approved = true;
      await writeStagingIndex(index);
    }

    if (proposal.operation === 'delete') {
      spinner.succeed(chalk.green(`✓ Deleted ${proposal.filePath}`));
    } else {
      spinner.succeed(chalk.green(`✓ Applied changes to ${proposal.filePath}`));
    }

    return { filePath: proposal.filePath, operation: proposal.operation, success: true };
  } catch (error) {
    spinner.fail(chalk.red(`Failed to apply changes to ${proposal.filePath}`));

    if (error instanceof Error) {
      if (error.message.includes('EACCES') || error.message.includes('Permission denied')) {
        throw new Error(`Permission denied: Cannot write to ${proposal.filePath}`);
      } else if (error.message.includes('ENOSPC')) {
        throw new Error('No space left on device');
      } else {
        throw error;
      }
    }
    throw error;
  }
}

/**
 * Approve all pending staged proposals
 */
export async function approveAll(projectRoot: string = process.cwd()): Promise<{
  success: ApproveResult[];
  failed: ApproveResult[];
}> {
  const index = await readStagingIndex();
  const pendingProposals = index.filter(e => !e.approved);

  if (pendingProposals.length === 0) {
    console.log(chalk.yellow('No pending proposals to approve'));
    return { success: [], failed: [] };
  }

  console.log(chalk.cyan(`\nApproving ${pendingProposals.length} pending proposal(s)...\n`));

  const results: { success: ApproveResult[]; failed: ApproveResult[] } = {
    success: [],
    failed: [],
  };

  for (const entry of pendingProposals) {
    try {
      const result = await approveProposal(entry.id, true, projectRoot);
      if (result.success) {
        results.success.push(result);
      } else {
        results.failed.push(result);
      }
    } catch (error) {
      results.failed.push({
        filePath: entry.filePath,
        operation: 'modify',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(chalk.red(`Error approving ${entry.filePath}:`), error instanceof Error ? error.message : error);
    }
  }

  console.log(chalk.cyan('\n=== Approval Summary ==='));
  console.log(chalk.green(`✓ Successfully applied: ${results.success.length}`));
  if (results.success.length > 0) {
    results.success.forEach(r => {
      const verb = r.operation === 'delete' ? 'deleted' : 'applied';
      console.log(chalk.green(`  - ${r.filePath} (${verb})`));
    });
  }

  if (results.failed.length > 0) {
    console.log(chalk.red(`✗ Failed: ${results.failed.length}`));
    results.failed.forEach(r => console.log(chalk.red(`  - ${r.filePath}${r.error ? `: ${r.error}` : ''}`)));
  }

  return results;
}

/**
 * Reject a staged proposal and remove it from staging
 * @param filePathOrProposalId File path or proposal ID to reject
 */
export async function rejectProposal(filePathOrProposalId: string): Promise<void> {
  const entry = await findProposal(filePathOrProposalId);

  if (!entry) {
    throw new Error(`Proposal not found: ${filePathOrProposalId}`);
  }

  try {
    const proposalPath = join(STAGING_DIR, `${entry.id}.json`);
    await unlink(proposalPath);

    const index = await readStagingIndex();
    const updatedIndex = index.filter(e => e.id !== entry.id);
    await writeStagingIndex(updatedIndex);

    console.log(chalk.yellow(`Rejected proposal for ${entry.filePath}`));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to reject proposal: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Revert an executed plan using originalContent from proposals
 * @param planId The ID of the plan to revert
 * @param projectRoot Project root directory
 */
export async function revertPlanExecution(planId: string, projectRoot: string = process.cwd()): Promise<{ success: boolean; reverted: string[]; failed: string[] }> {
  const index = await readStagingIndex();
  // Find all approved proposals for this plan, sort by latest first to reverse dependency order
  const planEntries = index.filter(e => e.planId === planId && e.approved)
                           .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (planEntries.length === 0) {
    return { success: false, reverted: [], failed: ['No approved proposals found for this plan.'] };
  }

  const reverted: string[] = [];
  const failed: string[] = [];

  for (const entry of planEntries) {
    const proposalPath = join(STAGING_DIR, `${entry.id}.json`);
    let proposal: StagedProposal;
    try {
      proposal = JSON.parse(await readFile(proposalPath, 'utf-8'));
    } catch {
      failed.push(`Failed to read proposal ${entry.id}`);
      continue;
    }

    const fullTargetPath = resolveSafeProjectPath(projectRoot, proposal.filePath);
    
    try {
      if (proposal.operation === 'create') {
        // Revert create -> delete file
        await unlink(fullTargetPath);
      } else if (proposal.operation === 'modify' || proposal.operation === 'delete') {
        // Revert modify/delete -> restore original content
        if (proposal.originalContent === undefined || proposal.originalContent === null) {
          throw new Error('No originalContent saved in proposal');
        }
        const targetDir = dirname(fullTargetPath);
        await mkdir(targetDir, { recursive: true });
        await writeFile(fullTargetPath, proposal.originalContent, 'utf-8');
      }

      // Mark proposal as unapproved in the proposal file
      proposal.approved = false;
      await writeFile(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8');
      
      // Mark as unapproved in index
      const indexEntry = index.find(e => e.id === entry.id);
      if (indexEntry) indexEntry.approved = false;

      reverted.push(proposal.filePath);
    } catch (error) {
      failed.push(`Failed to revert ${proposal.filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await writeStagingIndex(index);
  return { success: failed.length === 0, reverted, failed };
}
