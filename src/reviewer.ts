/**
 * Review module for Traycer-mini
 * Displays staged code proposals and their diffs
 */

import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { StagedProposal } from './types.js';
import { STAGING_DIR, STAGING_INDEX_FILE } from './config.js';

/**
 * Format diff content with syntax highlighting
 * @param diff - The diff string to format
 * @returns Formatted diff with colors
 */
function formatDiff(diff: string): string {
  return diff
    .split('\n')
    .map((line) => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        return chalk.green(line);
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        return chalk.red(line);
      } else if (line.startsWith('@@')) {
        return chalk.cyan(line);
      } else if (line.startsWith('+++') || line.startsWith('---')) {
        return chalk.gray(line);
      }
      return line;
    })
    .join('\n');
}

/**
 * Review staged code proposals with diffs
 * Displays all staged proposals in a formatted view
 */
export async function reviewProposals(): Promise<void> {
  try {
    // Check if staging directory exists
    try {
      await stat(STAGING_DIR);
    } catch (error) {
      console.log(chalk.yellow('No staged proposals to review'));
      return;
    }

    // Read staging index
    let indexData: Array<{ id: string; planId: string; filePath: string; createdAt: string }>;
    try {
      const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
      indexData = JSON.parse(indexContent);
    } catch (error) {
      console.log(chalk.yellow('No staged proposals to review'));
      return;
    }

    // Check if there are any proposals
    if (!indexData || indexData.length === 0) {
      console.log(chalk.yellow('No staged proposals to review'));
      return;
    }

    // Read all proposals
    const proposals: StagedProposal[] = [];
    for (const indexEntry of indexData) {
      try {
        const proposalPath = join(STAGING_DIR, `${indexEntry.id}.json`);
        const proposalContent = await readFile(proposalPath, 'utf-8');
        const proposal: StagedProposal = JSON.parse(proposalContent);
        proposals.push(proposal);
      } catch (error) {
        console.error(chalk.red(`Error reading proposal ${indexEntry.id}: ${error}`));
      }
    }

    if (proposals.length === 0) {
      console.log(chalk.yellow('No valid proposals found'));
      return;
    }

    // Display proposals list
    console.log(chalk.bold.blue('\n📋 Staged Code Proposals:\n'));
    proposals.forEach((proposal, index) => {
      const statusColor = proposal.approved ? chalk.green : chalk.yellow;
      const statusText = proposal.approved ? 'approved' : 'pending';
      const operationColor = proposal.operation === 'create' ? chalk.cyan : chalk.magenta;
      
      console.log(
        `${chalk.bold(`[${index + 1}]`)} ${chalk.white(proposal.filePath)} ` +
        `${operationColor(`(${proposal.operation})`)} ${statusColor(`[${statusText}]`)}`
      );
    });

    console.log(''); // Empty line

    // Display each proposal with diff
    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      
      console.log(chalk.gray('─'.repeat(80)));
      console.log(chalk.bold.white(`\n📄 File: ${proposal.filePath}`));
      console.log(chalk.gray(`Operation: ${proposal.operation}`));
      console.log(chalk.gray(`Created: ${new Date(proposal.createdAt).toLocaleString()}`));
      console.log('');
      
      // Display formatted diff
      console.log(formatDiff(proposal.diff));
      console.log('');
      console.log(chalk.gray('─'.repeat(80)));
      console.log('');
    }

    // Display summary
    const totalCount = proposals.length;
    const approvedCount = proposals.filter(p => p.approved).length;
    const pendingCount = totalCount - approvedCount;

    console.log(chalk.bold.blue('📊 Summary:'));
    console.log(`   Total proposals: ${chalk.bold(totalCount.toString())}`);
    console.log(`   Approved: ${chalk.green(approvedCount.toString())}`);
    console.log(`   Pending: ${chalk.yellow(pendingCount.toString())}`);
    console.log('');
    console.log(chalk.gray('💡 Use \'traycer-mini approve <file>\' to apply changes'));
    console.log('');

  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error reviewing proposals: ${error.message}`));
    } else {
      console.error(chalk.red('An unknown error occurred while reviewing proposals'));
    }
    throw error;
  }
}

/**
 * Interactive review with batch approval
 * Displays all diffs and allows user to select files to approve
 * @returns Array of selected file paths to approve
 */
export async function interactiveReview(): Promise<string[]> {
  try {
    // First, display all proposals
    await reviewProposals();

    // Check if staging directory exists and has proposals
    try {
      await stat(STAGING_DIR);
    } catch (error) {
      return [];
    }

    // Read staging index
    let indexData: Array<{ id: string; planId: string; filePath: string; createdAt: string }>;
    try {
      const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
      indexData = JSON.parse(indexContent);
    } catch (error) {
      return [];
    }

    if (!indexData || indexData.length === 0) {
      return [];
    }

    // Read all proposals to get pending ones
    const proposals: StagedProposal[] = [];
    for (const indexEntry of indexData) {
      try {
        const proposalPath = join(STAGING_DIR, `${indexEntry.id}.json`);
        const proposalContent = await readFile(proposalPath, 'utf-8');
        const proposal: StagedProposal = JSON.parse(proposalContent);
        proposals.push(proposal);
      } catch (error) {
        // Skip corrupted proposals
        continue;
      }
    }

    // Filter pending proposals
    const pendingProposals = proposals.filter(p => !p.approved);

    if (pendingProposals.length === 0) {
      console.log(chalk.yellow('No pending proposals to approve'));
      return [];
    }

    // Create choices for multi-select
    const choices = pendingProposals.map((proposal) => ({
      title: `${proposal.filePath} (${proposal.operation})`,
      value: proposal.filePath,
      selected: false,
    }));

    // Prompt user for selection
    const response = await prompts({
      type: 'multiselect',
      name: 'files',
      message: 'Select files to approve (use space to select, enter to confirm):',
      choices,
      hint: '- Space to select. Return to submit',
    });

    // Handle user cancellation (Ctrl+C)
    if (response.files === undefined) {
      console.log(chalk.yellow('\nInteractive review cancelled'));
      return [];
    }

    return response.files as string[];

  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error in interactive review: ${error.message}`));
    } else {
      console.error(chalk.red('An unknown error occurred during interactive review'));
    }
    throw error;
  }
}