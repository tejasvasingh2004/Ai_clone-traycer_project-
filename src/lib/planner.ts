/**
 * Planning module for Traycer-mini
 * Converts natural language tasks into structured plans using AI
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Plan } from './types';
import { getAIConfig, ensureDirectories, PLANS_DIR } from './config';
import { generateCode } from './generator';
import { extractJSON } from './utils/jsonUtils';
import { buildContext, contextToString } from './context';

/**
 * Get all files in the project directory recursively
 * @param dir - Directory to scan
 * @returns Promise<string[]> - Array of file paths relative to dir
 */
async function getProjectFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir, { recursive: true });
  return files.map(f => f.toString()).filter(f => !f.includes('node_modules') && !f.includes('.git'));
}

/**
 * Slugify a string to create a safe filename
 * @param text - Text to slugify
 * @returns Slugified string
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50); // Limit length
}

/**
 * Create a structured plan for a coding task using AI
 * @param taskDescription - Natural language description of the coding task
 * @param autoGenerateCode - Whether to automatically generate code after creating the plan
 * @returns Promise<Plan> - The generated plan object
 */
export async function createPlan(
  taskDescription: string,
  autoGenerateCode: boolean = false,
  projectRoot: string = process.cwd()
): Promise<Plan> {
  const spinner = ora('Building context...').start();

  try {
    // Build context using Context Engine
    const context = await buildContext(taskDescription, projectRoot);
    
    spinner.text = 'Creating plan...';

    // Get AI configuration
    const config = getAIConfig();
    const model = config.model;
    console.log("Using model:", model);

    // Construct enhanced system prompt with context
    const systemPrompt =
      `You are a senior full-stack engineer and expert software architect pair-programming on this specific repository. You explain your reasoning, flag edge cases, and point out risks a careful engineer would notice, not just the minimum needed to answer.\n\n` +
      `Before generating the plan, briefly reason through what's actually being asked, what part of the codebase is relevant, and what could go wrong.\n\n` +
      `Given a coding task and the project context, break it down into clear, actionable steps and identify all files that need to be created or modified.\n\n` +
      `PROJECT CONTEXT:\n${contextToString(context)}\n\n` +
      `IMPORTANT:\n` +
      `- Order steps by dependency (create types/interfaces before using them)\n` +
      `- Consider the existing code patterns: ${context.existingPatterns.importStyle} imports, ${context.existingPatterns.namingConvention} naming\n` +
      `- Check the import graph to avoid breaking existing dependencies\n` +
      `- Return ONLY valid JSON matching this schema: {taskName: string, steps: string[], filesToModify: string[], filesToDelete: string[], rationale: string, dependencyOrder: string[]}\n` +
      `- Use filesToDelete for files that should be removed from disk (not modified). Use filesToModify only for create/modify targets.\n` +
      `- Each step should be specific and implementable. File paths should be relative to project root.\n` +
      `- rationale should explain why each file needs changing\n` +
      `- dependencyOrder should list files in the order they should be generated (respecting dependencies)\n\n` +
      `EXAMPLE RESPONSE:\n` +
      `{\n` +
      `  "taskName": "Add User Authentication",\n` +
      `  "rationale": "We need to authenticate users before letting them access the dashboard. I've reasoned that we should start with the DB schema, then the auth utility, and finally the login route to prevent dependency errors. An edge case is token expiration, which the auth utility handles.",\n` +
      `  "steps": [\n` +
      `    "Update Prisma schema to include User model and run db push",\n` +
      `    "Create JWT utility for signing and verifying tokens",\n` +
      `    "Implement POST /api/auth/login endpoint"\n` +
      `  ],\n` +
      `  "filesToModify": ["prisma/schema.prisma", "server/utils/jwt.ts", "server/routes/auth.ts"],\n` +
      `  "filesToDelete": [],\n` +
      `  "dependencyOrder": ["prisma/schema.prisma", "server/utils/jwt.ts", "server/routes/auth.ts"]\n` +
      `}`;

    // Construct user prompt
    const userPrompt = `Task: ${taskDescription}`;

    let responseText: string = '';

    // Call appropriate AI provider
    if (config.provider === 'openai') {
      const openai = new OpenAI({ apiKey: config.apiKey });
      
      const completion = await openai.chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      responseText = completion.choices[0]?.message?.content || '{}';
    } else if (config.provider === 'groq') {
      const groq = new OpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      const completion = await groq.chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      responseText = completion.choices[0]?.message?.content || '{}';
    } else if (config.provider === 'anthropic') {
      // Anthropic
      const anthropic = new Anthropic({ apiKey: config.apiKey });
      
      const message = await anthropic.messages.create({
        model: config.model,
        temperature: config.temperature,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      });

      const content = message.content[0];
      responseText = content.type === 'text' ? content.text : '{}';
    } else if (config.provider === 'google') {
      // ✅ Google Gemini
      const genAI = new GoogleGenerativeAI(config.apiKey);

      // Choose model: "gemini-1.5-flash" (free, fast) or "gemini-1.5-pro"
      const model = genAI.getGenerativeModel({ model: config.model || 'gemini-1.5-flash' });

      // Combine system + user prompts (Gemini doesn't use roles the same way)
      const prompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: 4096,
        },
      });

      responseText = result.response.text() || '{}';
    }

    // Parse JSON response
    let parsedResponse: { 
      taskName?: string; 
      steps?: string[]; 
      filesToModify?: string[];
      filesToDelete?: string[];
      rationale?: string;
      dependencyOrder?: string[];
    };
    try {
      const extractedJSON = extractJSON(responseText);
      parsedResponse = JSON.parse(extractedJSON);
    } catch (error) {
      spinner.fail(chalk.red('Failed to parse AI response as JSON'));
      throw new Error(`Invalid JSON response from AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate required fields
    if (!parsedResponse.taskName || !Array.isArray(parsedResponse.steps) || !Array.isArray(parsedResponse.filesToModify)) {
      spinner.fail(chalk.red('AI response missing required fields'));
      throw new Error('AI response must include taskName, steps, and filesToModify');
    }

    // Auto-detect affected files via import graph
    let allFilesToModify = [...parsedResponse.filesToModify];
    for (const file of parsedResponse.filesToModify) {
      const dependencies = context.importGraph[file] || [];
      for (const dep of dependencies) {
        if (!allFilesToModify.includes(dep)) {
          allFilesToModify.push(dep);
        }
      }
    }

    // Generate unique plan ID
    const timestamp = Date.now();
    const slugifiedTask = slugify(parsedResponse.taskName);
    const planId = `${slugifiedTask}-${timestamp}`;

    // Rebuild dependencyOrder from final file set, appending inferred dependencies in deterministic order
    const baseOrder = parsedResponse.dependencyOrder || parsedResponse.filesToModify;
    const inferredDependencies = allFilesToModify.filter(file => !baseOrder.includes(file));
    // Sort inferred dependencies deterministically (alphabetically)
    inferredDependencies.sort((a, b) => a.localeCompare(b));
    // Combine: AI-provided order first, then inferred dependencies
    const finalDependencyOrder = [...baseOrder, ...inferredDependencies];

    // Create Plan object with enhanced schema
    const plan: Plan = {
      id: planId,
      taskName: parsedResponse.taskName,
      steps: parsedResponse.steps,
      filesToModify: allFilesToModify,
      filesToDelete: Array.isArray(parsedResponse.filesToDelete) ? parsedResponse.filesToDelete : [],
      createdAt: new Date().toISOString(),
      rationale: parsedResponse.rationale,
      dependencyOrder: finalDependencyOrder,
      contextSnapshot: {
        projectSummary: context.projectSummary,
        existingPatterns: context.existingPatterns
      }
    };

    // Ensure plans directory exists
    ensureDirectories();

    // Write plan to file
    const planPath = join(PLANS_DIR, `${planId}.json`);
    await writeFile(planPath, JSON.stringify(plan, null, 2), 'utf-8');

    // Stop spinner and show success
    spinner.succeed(chalk.green(`Plan created successfully: ${planPath}`));

    // Automatically generate code if requested
    if (autoGenerateCode) {
      spinner.start('Generating code...');
      try {
        const proposals = await generateCode(planPath);
        spinner.succeed(chalk.green(`Code generation completed: ${proposals.length} proposal${proposals.length !== 1 ? 's' : ''} created`));
      } catch (error) {
        spinner.fail(chalk.red('Code generation failed'));
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        // Don't throw error here - plan was created successfully
      }
    }

    return plan;

  } catch (error) {
    spinner.fail(chalk.red('Failed to create plan'));
    
    // Show user-friendly error message
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red('An unknown error occurred'));
    }
    
    throw error;
  }
}
