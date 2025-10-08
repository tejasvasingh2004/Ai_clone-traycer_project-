/**
 * Planning module for Traycer-mini
 * Converts natural language tasks into structured plans using AI
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Plan } from './types.js';
import { getAIConfig, ensureDirectories, PLANS_DIR } from './config.js';

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
 * @returns Promise<Plan> - The generated plan object
 */
export async function createPlan(taskDescription: string): Promise<Plan> {
  const spinner = ora('Creating plan...').start();

  try {
    // Get AI configuration
    const config = getAIConfig();

    // Construct system prompt
    const systemPrompt = 
      'You are an expert software architect. Given a coding task, break it down into clear, actionable steps and identify all files that need to be created or modified.\n' +
      'Return ONLY valid JSON matching this schema: {taskName: string, steps: string[], filesToModify: string[]}\n' +
      'Each step should be specific and implementable. File paths should be relative to project root.';

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
    } else if (config.provider === 'anthropic') {
      // Anthropic
      const anthropic = new Anthropic({ apiKey: config.apiKey });
      
      const message = await anthropic.messages.create({
        model: config.model,
        temperature: config.temperature,
        max_tokens: 2000,
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
          maxOutputTokens: 2048,
        },
      });

      responseText = result.response.text() || '{}';
    }

    // Parse JSON response
    let parsedResponse: { taskName?: string; steps?: string[]; filesToModify?: string[] };
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (error) {
      spinner.fail(chalk.red('Failed to parse AI response as JSON'));
      throw new Error(`Invalid JSON response from AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate required fields
    if (!parsedResponse.taskName || !Array.isArray(parsedResponse.steps) || !Array.isArray(parsedResponse.filesToModify)) {
      spinner.fail(chalk.red('AI response missing required fields'));
      throw new Error('AI response must include taskName, steps, and filesToModify');
    }

    // Generate unique plan ID
    const timestamp = Date.now();
    const slugifiedTask = slugify(parsedResponse.taskName);
    const planId = `${slugifiedTask}-${timestamp}`;

    // Create Plan object
    const plan: Plan = {
      id: planId,
      taskName: parsedResponse.taskName,
      steps: parsedResponse.steps,
      filesToModify: parsedResponse.filesToModify,
      createdAt: new Date().toISOString()
    };

    // Ensure plans directory exists
    ensureDirectories();

    // Write plan to file
    const planPath = join(PLANS_DIR, `${planId}.json`);
    await writeFile(planPath, JSON.stringify(plan, null, 2), 'utf-8');

    // Stop spinner and show success
    spinner.succeed(chalk.green(`Plan created successfully: ${planPath}`));

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