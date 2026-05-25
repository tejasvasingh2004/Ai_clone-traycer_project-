#!/usr/bin/env node

/**
 * Main CLI entry point for Traycer-mini
 * Orchestrates all commands using Commander.js
 */

import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import { readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { createPlan } from './planner.js';
import { generateCode } from './generator.js';
import { reviewProposals, interactiveReview, rejectProposal } from './reviewer.js';
import { approveProposal, approveAll } from './approver.js';
import { verifyCode } from './verifier.js';
import { ensureDirectories, STAGING_DIR } from './config.js';
import { buildContext, contextToString } from './context.js';

/**
 * Check Node.js version requirement
 */
function checkNodeVersion(): void {
  const requiredVersion = 18;
  const currentVersion = parseInt(process.version.slice(1).split('.')[0]);
  
  if (currentVersion < requiredVersion) {
    console.error(
      chalk.red(`Error: Node.js version ${requiredVersion}.0.0 or higher is required.`)
    );
    console.error(chalk.red(`Current version: ${process.version}`));
    process.exit(1);
  }
}

/**
 * Global error handler
 */
function handleError(error: unknown, command?: string): void {
  const debugMode = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
  
  console.error(chalk.red(`\n✗ Error${command ? ` in ${command} command` : ''}:`));
  
  if (error instanceof Error) {
    console.error(chalk.red(error.message));
    
    if (debugMode && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
  } else {
    console.error(chalk.red(String(error)));
  }
  
  if (!debugMode) {
    console.error(chalk.gray('\nRun with DEBUG=true for more details'));
  }
  
  process.exit(1);
}

/**
 * Main CLI program
 */
async function main(): Promise<void> {
  // Startup checks
  checkNodeVersion();
  ensureDirectories();
  
  // Setup Commander program
  const program = new Command();
  
  program
    .name('traycer-mini')
    .description('AI-powered code generation workflow tool')
    .version('1.0.0');
  
  // Plan command
  program
    .command('plan')
    .description('Create a structured plan for a coding task')
    .argument('<task>', 'Natural language description of the coding task')
    .option('-g, --generate', 'Automatically generate code after creating the plan')
    .action(async (task: string, options: { generate?: boolean }) => {
      try {
        const plan = await createPlan(task, options.generate || false);
        console.log(chalk.green.bold('\n✓ Plan created successfully!'));
        console.log(chalk.cyan(`\nPlan ID: ${plan.id}`));
        console.log(chalk.cyan(`Plan file: plans/${plan.id}.json`));
        if (options.generate) {
          console.log(chalk.gray(`\n💡 Next step: Run 'traycer-mini review' to see the generated code changes`));
        } else {
          console.log(chalk.gray(`\n💡 Next step: Run 'traycer-mini generate plans/${plan.id}.json' to generate code`));
        }
      } catch (error) {
        handleError(error, 'plan');
      }
    });
  
  // Generate command
  program
    .command('generate')
    .description('Generate code based on a plan file')
    .argument('<plan-path>', 'Path to the plan JSON file')
    .action(async (planPath: string) => {
      try {
        // Validate plan file exists
        try {
          await stat(planPath);
        } catch (error) {
          throw new Error(`Plan file not found: ${planPath}`);
        }
        
        const proposals = await generateCode(planPath);
        
        console.log(chalk.green.bold(`\n✓ Code generation completed!`));
        console.log(chalk.cyan(`Generated ${proposals.length} proposal${proposals.length !== 1 ? 's' : ''}`));
        console.log(chalk.gray(`\n💡 Next step: Run 'traycer-mini review' to see the changes`));
      } catch (error) {
        handleError(error, 'generate');
      }
    });
  
  // Review command
  program
    .command('review')
    .description('Review staged code proposals with diffs')
    .option('-i, --interactive', 'Enable interactive approval mode')
    .action(async (options: { interactive?: boolean }) => {
      try {
        if (options.interactive) {
          // Interactive mode: show diffs and allow selection
          const selectedFiles = await interactiveReview();
          
          if (selectedFiles.length > 0) {
            console.log(chalk.cyan(`\nApproving ${selectedFiles.length} selected file(s)...\n`));
            
            for (const file of selectedFiles) {
              try {
                await approveProposal(file, true); // Skip individual confirmations
              } catch (error) {
                console.error(chalk.red(`Failed to approve ${file}:`), error instanceof Error ? error.message : error);
              }
            }
            
            console.log(chalk.green.bold('\n✓ Interactive approval completed!'));
            console.log(chalk.gray(`\n💡 Next step: Run 'traycer-mini verify' to check code quality`));
          } else {
            console.log(chalk.yellow('\nNo files selected for approval'));
          }
        } else {
          // Standard review mode: just show diffs
          await reviewProposals();
          console.log(chalk.gray(`💡 Next step: Run 'traycer-mini approve <file>' to apply changes`));
        }
      } catch (error) {
        handleError(error, 'review');
      }
    });
  
  // Approve command
  program
    .command('approve')
    .description('Apply a staged proposal to the codebase')
    .argument('[file]', 'File path or proposal ID to approve')
    .option('--all', 'Approve all pending proposals')
    .action(async (file: string | undefined, options: { all?: boolean }) => {
      try {
        if (options.all) {
          // Approve all pending proposals
          await approveAll();
          console.log(chalk.green.bold('\n✓ All pending proposals approved!'));
          console.log(chalk.gray(`\n💡 Next step: Run 'traycer-mini verify' to check code quality`));
        } else if (file) {
          // Approve specific file
          await approveProposal(file);
          console.log(chalk.green.bold('\n✓ Proposal approved successfully!'));
          console.log(chalk.gray(`\n💡 Next step: Run 'traycer-mini verify' to check code quality`));
        } else {
          console.error(chalk.red('Error: Please specify a file path or use --all flag'));
          console.log(chalk.gray('Usage: traycer-mini approve <file>'));
          console.log(chalk.gray('   or: traycer-mini approve --all'));
          process.exit(1);
        }
      } catch (error) {
        handleError(error, 'approve');
      }
    });

  // Reject command
  program
    .command('reject')
    .description('Reject a staged proposal with feedback')
    .argument('<file>', 'File path to reject')
    .option('--reason <reason>', 'Reason for rejection')
    .action(async (file: string, options: { reason?: string }) => {
      try {
        const reason = options.reason || 'No reason provided';
        await rejectProposal(file, reason);
        console.log(chalk.gray(`\n💡 Next step: Run 'traycer-mini review' to see the regenerated code`));
      } catch (error) {
        handleError(error, 'reject');
      }
    });
  
  // Verify command
  program
    .command('verify')
    .description('Run TypeScript and linting checks')
    .action(async () => {
      try {
        const result = await verifyCode();
        
        if (result.success) {
          console.log(chalk.green.bold('\n✓ Verification passed!'));
          process.exit(0);
        } else {
          console.log(chalk.red.bold('\n✗ Verification failed'));
          console.log(chalk.gray('Fix the errors above and run verify again'));
          process.exit(1);
        }
      } catch (error) {
        handleError(error, 'verify');
      }
    });
  
  // Clean command
  program
    .command('clean')
    .description('Clear all staged proposals')
    .action(async () => {
      try {
        // Check if staging directory exists
        try {
          await stat(STAGING_DIR);
        } catch (error) {
          console.log(chalk.yellow('No staging directory found - nothing to clean'));
          return;
        }
        
        // Prompt for confirmation
        const response = await prompts({
          type: 'confirm',
          name: 'confirmed',
          message: 'Are you sure you want to delete all staged proposals?',
          initial: false,
        });
        
        if (!response.confirmed) {
          console.log(chalk.yellow('Clean operation cancelled'));
          return;
        }
        
        // Delete all files in staging directory
        const files = await readdir(STAGING_DIR);
        let deletedCount = 0;
        
        for (const file of files) {
          if (file !== '.gitkeep') {
            const filePath = join(STAGING_DIR, file);
            await unlink(filePath);
            deletedCount++;
          }
        }
        
        console.log(chalk.green(`✓ Deleted ${deletedCount} staged proposal${deletedCount !== 1 ? 's' : ''}`));
      } catch (error) {
        handleError(error, 'clean');
      }
    });

  // Context command
  program
    .command('context')
    .description('Show what context would be sent for a given task')
    .argument('<task>', 'Natural language description of the task')
    .action(async (task: string) => {
      try {
        console.log(chalk.bold.blue('\n📊 Building context for task:'));
        console.log(chalk.gray(task));
        console.log('');
        
        const context = await buildContext(task);
        console.log(chalk.bold.cyan(contextToString(context)));
      } catch (error) {
        handleError(error, 'context');
      }
    });
  
  // Parse arguments
  await program.parseAsync(process.argv);
}

// Run main function
main().catch((error) => {
  handleError(error);
});

// Export program for testing
export { main };