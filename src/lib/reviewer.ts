/**
 * Review module for Traycer-mini
 * Displays staged code proposals and their diffs
 */

import { readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import ora from 'ora';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StagedProposal } from './types';
import { STAGING_DIR, STAGING_INDEX_FILE, getAIConfig } from './config';
import { extractJSON } from './utils/jsonUtils';

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
 * Generate AI review summary for a proposal
 * @param proposal - The proposal to review
 * @returns AI-generated review summary
 */
async function generateAIReviewSummary(proposal: StagedProposal): Promise<string> {
  try {
    const config = getAIConfig();
    const prompt = `Review this code change:\n\nFile: ${proposal.filePath}\nOperation: ${proposal.operation}\n\nDiff:\n${proposal.diff}\n\nProvide a 3-5 line summary covering:\n1. What changed and why\n2. Potential issues or risks\n3. Confidence score (High/Medium/Low)`;

    let summary = '';

    if (config.provider === 'openai') {
      const openai = new OpenAI({ apiKey: config.apiKey });
      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });
      summary = response.choices[0]?.message?.content || '';
    } else if (config.provider === 'groq') {
      const groq = new OpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const response = await groq.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });
      summary = response.choices[0]?.message?.content || '';
    } else if (config.provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: config.apiKey });
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });
      const content = response.content[0];
      summary = content.type === 'text' ? content.text : '';
    } else if (config.provider === 'google') {
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const model = genAI.getGenerativeModel({ model: config.model || 'gemini-1.5-flash' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300,
        },
      });
      summary = result.response.text() || '';
    }

    return summary.trim();
  } catch (error) {
    return 'AI review summary unavailable';
  }
}

/**
 * Calculate line count delta from diff
 * @param diff - The diff string
 * @returns Object with added and removed line counts
 */
function calculateLineDelta(diff: string): { added: number; removed: number } {
  const lines = diff.split('\n');
  let added = 0;
  let removed = 0;

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    if (line.startsWith('-') && !line.startsWith('---')) removed++;
  }

  return { added, removed };
}

/**
 * Reject a proposal with feedback
 * @param filePath - File path to reject
 * @param reason - Rejection reason
 */
export async function rejectProposal(filePath: string, reason: string): Promise<void> {
  try {
    // Read staging index to find proposal
    const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
    const indexData = JSON.parse(indexContent);
    
    // Find all matching entries for the file path
    const matchingEntries = indexData.filter((e: { filePath: string }) => e.filePath === filePath);
    
    if (matchingEntries.length === 0) {
      throw new Error(`Proposal not found for file: ${filePath}`);
    }
    
    // Prefer the latest proposal version
    matchingEntries.sort((a: { createdAt: string }, b: { createdAt: string }) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const indexEntry = matchingEntries[0];

    // Read proposal
    const proposalPath = join(STAGING_DIR, `${indexEntry.id}.json`);
    const proposalContent = await readFile(proposalPath, 'utf-8');
    const proposal: StagedProposal = JSON.parse(proposalContent);

    // Add rejection to history
    if (!proposal.rejectionHistory) {
      proposal.rejectionHistory = [];
    }
    proposal.rejectionHistory.push({
      reason,
      timestamp: new Date().toISOString(),
    });

    // Update proposal
    await writeFile(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8');

    console.log(chalk.green(`✓ Rejection recorded for ${filePath}`));
    console.log(chalk.gray(`Reason: ${reason}`));
    
    // Resolve the originating plan and invoke generateCode with rejection feedback
    const { generateCode } = await import('./generator');
    const planPath = `plans/${proposal.planId}.json`;
    
    console.log(chalk.cyan(`\n🔄 Regenerating code for plan: ${proposal.planId}`));
    await generateCode(planPath, reason);
    console.log(chalk.green(`✓ Code regenerated with rejection feedback`));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error rejecting proposal: ${error.message}`));
    } else {
      console.error(chalk.red('An unknown error occurred while rejecting proposal'));
    }
    throw error;
  }
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
      
      // Quality indicators
      const badge = proposal.operation === 'create' ? chalk.cyan('[NEW FILE]') : chalk.magenta('[MODIFIED]');
      const lineDelta = calculateLineDelta(proposal.diff);
      const deltaText = chalk.green(`+${lineDelta.added}`) + ' / ' + chalk.red(`-${lineDelta.removed}`) + ' lines';
      const depImpact = proposal.generationContext?.length 
        ? chalk.yellow(`imports used by ${proposal.generationContext.length} other files`) 
        : '';
      
      console.log(chalk.bold.white(`\n📄 File: ${proposal.filePath}`));
      console.log(`${badge} ${deltaText} ${depImpact}`);
      console.log(chalk.gray(`Created: ${new Date(proposal.createdAt).toLocaleString()}`));
      console.log('');
      
      // Display formatted diff
      console.log(formatDiff(proposal.diff));
      console.log('');
      
      // Generate and display AI review summary
      const spinner = ora('Generating AI review summary...').start();
      const aiSummary = await generateAIReviewSummary(proposal);
      spinner.stop();
      
      console.log(chalk.bold.cyan('\n🤖 AI Review Summary:'));
      console.log(chalk.gray(aiSummary));
      console.log('');
      
      // Display rejection history if exists
      if (proposal.rejectionHistory && proposal.rejectionHistory.length > 0) {
        console.log(chalk.bold.yellow('⚠️  Rejection History:'));
        for (const rejection of proposal.rejectionHistory) {
          console.log(chalk.gray(`  - ${new Date(rejection.timestamp).toLocaleString()}: ${rejection.reason}`));
        }
        console.log('');
      }
      
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
