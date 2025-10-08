/**
 * Approval module for Traycer-mini
 * Applies staged code proposals to the actual codebase
 */

import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { dirname, join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { StagedProposal } from './types.js';
import { STAGING_DIR, STAGING_INDEX_FILE } from './config.js';

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

/**
 * Read the staging index file
 * @returns Array of staging index entries
 */
async function readStagingIndex(): Promise<StagingIndexEntry[]> {
  try {
    const content = await readFile(STAGING_INDEX_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist, return empty array
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
  
  // Try to match by ID first
  let entry = index.find(e => e.id === filePathOrProposalId);
  
  // If not found, try to match by file path
  if (!entry) {
    entry = index.find(e => e.filePath === filePathOrProposalId);
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
  skipConfirmation: boolean = false
): Promise<void> {
  // Find the proposal
  const entry = await findProposal(filePathOrProposalId);
  
  if (!entry) {
    throw new Error(`Proposal not found: ${filePathOrProposalId}`);
  }
  
  // Read the full proposal
  const proposalPath = join(STAGING_DIR, `${entry.id}.json`);
  let proposal: StagedProposal;
  
  try {
    const content = await readFile(proposalPath, 'utf-8');
    proposal = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read proposal file: ${proposalPath}`);
  }
  
  // Show confirmation prompt unless skipped
  if (!skipConfirmation) {
    const response = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `Apply this change to ${chalk.cyan(proposal.filePath)} (${chalk.yellow(proposal.operation)})?`,
      initial: true,
    });
    
    if (!response.confirmed) {
      console.log(chalk.yellow('Approval cancelled'));
      return;
    }
  }
  
  // Show spinner
  const spinner = ora(`Applying changes to ${proposal.filePath}...`).start();
  
  try {
    // Ensure target directory exists
    const targetDir = dirname(proposal.filePath);
    await mkdir(targetDir, { recursive: true });
    
    // Write new content to target file
    await writeFile(proposal.filePath, proposal.newContent, 'utf-8');
    
    // Update proposal status
    proposal.approved = true;
    await writeFile(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8');
    
    // Update staging index
    const index = await readStagingIndex();
    const indexEntry = index.find(e => e.id === entry.id);
    if (indexEntry) {
      indexEntry.approved = true;
      await writeStagingIndex(index);
    }
    
    // Stop spinner and show success
    spinner.succeed(chalk.green(`✓ Applied changes to ${proposal.filePath}`));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to apply changes to ${proposal.filePath}`));
    
    if (error instanceof Error) {
      if (error.message.includes('EACCES')) {
        throw new Error(`Permission denied: Cannot write to ${proposal.filePath}`);
      } else if (error.message.includes('ENOSPC')) {
        throw new Error('No space left on device');
      } else {
        throw new Error(`Failed to write file: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * Approve all pending staged proposals
 */
export async function approveAll(): Promise<void> {
  const index = await readStagingIndex();
  const pendingProposals = index.filter(e => !e.approved);
  
  if (pendingProposals.length === 0) {
    console.log(chalk.yellow('No pending proposals to approve'));
    return;
  }
  
  console.log(chalk.cyan(`\nApproving ${pendingProposals.length} pending proposal(s)...\n`));
  
  const results: { success: string[]; failed: string[] } = {
    success: [],
    failed: [],
  };
  
  for (const entry of pendingProposals) {
    try {
      await approveProposal(entry.id, true); // Skip confirmation
      results.success.push(entry.filePath);
    } catch (error) {
      results.failed.push(entry.filePath);
      console.error(chalk.red(`Error approving ${entry.filePath}:`), error instanceof Error ? error.message : error);
    }
  }
  
  // Show summary
  console.log(chalk.cyan('\n=== Approval Summary ==='));
  console.log(chalk.green(`✓ Successfully applied: ${results.success.length}`));
  if (results.success.length > 0) {
    results.success.forEach(file => console.log(chalk.green(`  - ${file}`)));
  }
  
  if (results.failed.length > 0) {
    console.log(chalk.red(`✗ Failed: ${results.failed.length}`));
    results.failed.forEach(file => console.log(chalk.red(`  - ${file}`)));
  }
}

/**
 * Reject a staged proposal and remove it from staging
 * @param filePathOrProposalId File path or proposal ID to reject
 */
export async function rejectProposal(filePathOrProposalId: string): Promise<void> {
  // Find the proposal
  const entry = await findProposal(filePathOrProposalId);
  
  if (!entry) {
    throw new Error(`Proposal not found: ${filePathOrProposalId}`);
  }
  
  try {
    // Delete the proposal file
    const proposalPath = join(STAGING_DIR, `${entry.id}.json`);
    await unlink(proposalPath);
    
    // Update staging index to remove the entry
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