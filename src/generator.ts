/**
 * Code generation module for Traycer-mini
 * Uses AI to generate code based on plan steps
 */
import 'dotenv/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { createPatch } from 'diff';
import chalk from 'chalk';
import ora from 'ora';
import { Plan, StagedProposal } from './types.js';
import { getAIConfig, ensureDirectories, STAGING_DIR, STAGING_INDEX_FILE } from './config.js';
import { extractCode } from './utils/jsonUtils.js';
import { resolveFilesToDelete } from './utils/deleteIntent.js';

/**
 * Convert file path to safe filename for staging
 * @param filePath - Original file path
 * @returns Sanitized filename
 */
function sanitizeFilename(filePath: string): string {
  return filePath
    .replace(/\\/g, '-')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Generate code based on a plan file
 * @param planPath - Path to the plan JSON file
 * @param rejectionFeedback - Optional feedback from previous rejection
 * @returns Array of staged proposals
 */
export async function generateCode(
  planPath: string,
  rejectionFeedback?: string,
  progressCallback?: (proposal: StagedProposal) => void,
  projectRoot: string = process.cwd()
): Promise<StagedProposal[]> {
  const spinner = ora('Reading plan...').start();

  try {
    // 1. Read and parse the plan JSON file
    const planContent = await readFile(planPath, 'utf-8');
    const plan: Plan = JSON.parse(planContent);

    // 2. Validate plan structure
    if (!plan.taskName || !plan.steps || !plan.filesToModify) {
      throw new Error('Invalid plan structure: missing required fields (taskName, steps, filesToModify)');
    }

    if (!Array.isArray(plan.steps) || !Array.isArray(plan.filesToModify)) {
      throw new Error('Invalid plan structure: steps and filesToModify must be arrays');
    }

    spinner.succeed(chalk.green(`Plan loaded: ${plan.taskName}`));

    // 3. Get AI configuration
    const config = getAIConfig();
    console.log(chalk.blue(`Using ${config.provider} (${config.model})`));

    // 4. Ensure staging directory exists
    ensureDirectories();

    // 5. Initialize empty array for staged proposals
    const stagedProposals: StagedProposal[] = [];

    // Initialize AI clients
    let openaiClient: OpenAI | null = null;
    let anthropicClient: Anthropic | null = null;
    let googleClient: GoogleGenerativeAI | null = null;

    if (config.provider === 'openai') {
      openaiClient = new OpenAI({ apiKey: config.apiKey });
    } else if (config.provider === 'groq') {
      openaiClient = new OpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    } else if (config.provider === 'google') {
      googleClient = new GoogleGenerativeAI(config.apiKey);
    } else if (config.provider === 'anthropic') {
      anthropicClient = new Anthropic({ apiKey: config.apiKey });
    }

    // 6. Split delete targets from create/modify targets
    const filesToDelete = resolveFilesToDelete(plan);
    const allFiles = plan.dependencyOrder || plan.filesToModify;
    const filesToGenerate = allFiles.filter(f => !filesToDelete.includes(f));

    // 6a. Create delete proposals (no AI call — deterministic removal intent)
    for (const filePath of filesToDelete) {
      spinner.start(chalk.cyan(`Staging deletion for ${filePath}...`));

      try {
        const targetFullPath = join(projectRoot, filePath);
        let existingContent = '';
        try {
          existingContent = await readFile(targetFullPath, 'utf-8');
        } catch {
          throw new Error(`Cannot delete ${filePath}: file does not exist on disk`);
        }

        const diffContent = createPatch(filePath, existingContent, '', 'existing', 'deleted');
        const timestamp = Date.now();
        const sanitizedFilename = sanitizeFilename(filePath);
        const proposalId = `${plan.id}-${sanitizedFilename}-delete-${timestamp}`;

        const proposal: StagedProposal = {
          id: proposalId,
          planId: plan.id,
          filePath,
          newContent: '',
          diff: diffContent,
          operation: 'delete',
          approved: false,
          createdAt: new Date().toISOString(),
          originalContent: existingContent,
        };

        const proposalPath = join(STAGING_DIR, `${proposalId}.json`);
        await writeFile(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8');
        stagedProposals.push(proposal);
        if (progressCallback) progressCallback(proposal);
        spinner.succeed(chalk.green(`✓ Staged deletion for ${filePath}`));
      } catch (error) {
        spinner.fail(chalk.red(`✗ Failed to stage deletion for ${filePath}`));
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        throw error;
      }
    }

    // 7. For each create/modify file in dependency order
    for (const filePath of filesToGenerate) {
      spinner.start(chalk.cyan(`Generating code for ${filePath}...`));

      try {
        // Determine relevant steps (filter steps that mention this file path)
        const relevantSteps = plan.steps.filter(step => 
          step.toLowerCase().includes(filePath.toLowerCase()) ||
          step.toLowerCase().includes(filePath.split('/').pop()?.toLowerCase() || '')
        );
        
        // Use all steps if no specific steps mention this file
        const stepsToUse = relevantSteps.length > 0 ? relevantSteps : plan.steps;

        // Check if file already exists relative to projectRoot
        let fileExists = false;
        let existingContent = '';
        const targetFullPath = join(projectRoot, filePath);
        try {
          await access(targetFullPath);
          existingContent = await readFile(targetFullPath, 'utf-8');
          fileExists = true;
        } catch {
          fileExists = false;
        }

        // Construct system prompt
        const systemPrompt = 
          'You are an expert TypeScript developer. Generate clean, production-ready code. ' +
          'Return ONLY the complete file content, no explanations or markdown code blocks.';

        // Construct user prompt
        let userPrompt = `Task: ${plan.taskName}\n\n`;
        userPrompt += `Steps to implement:\n${stepsToUse.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n`;
        userPrompt += `File: ${filePath}\n`;
        userPrompt += `Operation: ${fileExists ? 'Modify existing file' : 'Create new file'}\n\n`;
        
        if (fileExists) {
          userPrompt += `Current file content:\n\`\`\`typescript\n${existingContent}\n\`\`\`\n\n`;
        }

        // Add context from previously generated files (multi-file coherence)
        if (stagedProposals.length > 0) {
          userPrompt += `Context from previously generated files:\n`;
          for (const proposal of stagedProposals) {
            userPrompt += `\n--- ${proposal.filePath} ---\n`;
            userPrompt += proposal.newContent;
            userPrompt += '\n';
          }
          userPrompt += '\n';
        }

        // Add rejection feedback if provided
        if (rejectionFeedback) {
          userPrompt += `REJECTION FEEDBACK: Previous attempt was rejected because: ${rejectionFeedback}\n`;
          userPrompt += `Please fix the issues mentioned above.\n\n`;
        }
        
        userPrompt += `Generate the complete TypeScript code for this file. Return only the code, no explanations.`;

        // 7. Call appropriate AI provider
        let generatedCode = '';

        if ((config.provider === 'openai' || config.provider === 'groq') && openaiClient) {
          const response = await openaiClient.chat.completions.create({
            model: config.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: config.temperature,
          });

          generatedCode = response.choices[0]?.message?.content || '';
        } else if (config.provider === 'anthropic' && anthropicClient) {
          const response = await anthropicClient.messages.create({
            model: config.model,
            max_tokens: 4000,
            temperature: config.temperature,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userPrompt }
            ],
          });

          const content = response.content[0];
          if (content.type === 'text') {
            generatedCode = content.text;
          }
        } else if (config.provider === 'google' && googleClient) {
  // ✅ Gemini support
  const model = googleClient.getGenerativeModel({ model: config.model || "gemini-1.5-flash" });

  // Combine system + user prompts into one message since Gemini doesn't separate roles
  const prompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: 4096,
    },
  });

  generatedCode = result.response.text() || '';
}

        // 8. Extract generated code (trim whitespace, remove markdown code fences)
        generatedCode = extractCode(generatedCode);

        // Validate that extracted content is non-empty
        if (!generatedCode || generatedCode.trim().length === 0) {
          throw new Error('Generated code is empty after extraction');
        }

        // 9. Generate diff
        let diffContent: string;
        if (fileExists) {
          // Use diff.createPatch for existing files
          diffContent = createPatch(
            filePath,
            existingContent,
            generatedCode,
            'existing',
            'proposed'
          );
        } else {
          // Create simple diff showing all lines as additions for new files
          const lines = generatedCode.split('\n');
          diffContent = `--- /dev/null\n+++ ${filePath}\n@@ -0,0 +1,${lines.length} @@\n`;
          diffContent += lines.map(line => `+${line}`).join('\n');
        }

        // 10. Create StagedProposal object
        const timestamp = Date.now();
        const sanitizedFilename = sanitizeFilename(filePath);
        const proposalId = `${plan.id}-${sanitizedFilename}-${timestamp}`;

        // Track generation context (which previously generated files were used)
        const generationContext = stagedProposals.map(p => p.filePath);

        const proposal: StagedProposal = {
          id: proposalId,
          planId: plan.id,
          filePath: filePath,
          newContent: generatedCode,
          diff: diffContent,
          operation: fileExists ? 'modify' : 'create',
          approved: false,
          createdAt: new Date().toISOString(),
          generationContext,
          rejectionHistory: rejectionFeedback ? [{
            reason: rejectionFeedback,
            timestamp: new Date().toISOString()
          }] : undefined
        };

        // 11. Write proposal to staging/{proposalId}.json
        const proposalPath = join(STAGING_DIR, `${proposalId}.json`);
        await writeFile(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8');

        // 12. Add proposal to array
        stagedProposals.push(proposal);
          if (progressCallback) {
            progressCallback(proposal);
          }

        // 13. Update spinner to show completion
        spinner.succeed(chalk.green(`✓ Generated code for ${filePath}`));

      } catch (error) {
        spinner.fail(chalk.red(`✗ Failed to generate code for ${filePath}`));
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        throw error;
      }
    }

    // 14. After all files processed, update staging index
    let stagingIndex: Array<{ id: string; planId: string; filePath: string; createdAt: string }> = [];
    
    try {
      const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
      stagingIndex = JSON.parse(indexContent);
    } catch {
      // File doesn't exist or is invalid, start with empty array
      stagingIndex = [];
    }

    // Replace previous staged proposals for the same file when regenerating
    for (const proposal of stagedProposals) {
      // Remove existing entries for the same filePath
      stagingIndex = stagingIndex.filter(entry => entry.filePath !== proposal.filePath);
      
      // Add the new proposal entry
      stagingIndex.push({
        id: proposal.id,
        planId: proposal.planId,
        filePath: proposal.filePath,
        createdAt: proposal.createdAt,
      });
    }

    // Write back to staging/index.json
    await writeFile(STAGING_INDEX_FILE, JSON.stringify(stagingIndex, null, 2), 'utf-8');

    // 15. Show success summary
    console.log(chalk.green.bold(`\n✓ Generated ${stagedProposals.length} code proposal${stagedProposals.length === 1 ? '' : 's'} in staging/`));
    console.log(chalk.blue(`\nNext step: Run 'traycer-mini review' to see the changes`));

    // 16. Return array of staged proposals
    return stagedProposals;

  } catch (error) {
    spinner.fail(chalk.red('Failed to generate code'));
    
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        console.error(chalk.red(`\nError: Plan file not found at ${planPath}`));
      } else if (error.message.includes('JSON')) {
        console.error(chalk.red(`\nError: Invalid JSON in plan file`));
      } else if (error.message.includes('API')) {
        console.error(chalk.red(`\nError: AI API error - ${error.message}`));
      } else {
        console.error(chalk.red(`\nError: ${error.message}`));
      }
    } else {
      console.error(chalk.red(`\nUnexpected error: ${String(error)}`));
    }
    
    throw error;
  }
}