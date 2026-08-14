/**
 * Configuration module for Traycer-mini
 * Manages environment variables and AI provider settings
 */

import dotenv from 'dotenv';
import { mkdirSync } from 'fs';
import { GeneratorConfig, AIProvider } from './types';

dotenv.config();

/**
 * Directory paths for plans and staging
 */
import { resolve } from 'path';

// After Phase 6 promotion, the app runs at project root.
const rootDir = process.cwd();

export const PLANS_DIR = resolve(rootDir, 'plans');
export const STAGING_DIR = resolve(rootDir, 'staging');
export const STAGING_INDEX_FILE = resolve(rootDir, 'staging', 'index.json');
export const REPOS_DIR = resolve(rootDir, 'repositories');
export const REPOS_INDEX_FILE = resolve(rootDir, 'repositories', 'index.json');

/**
 * Get AI configuration from environment variables
 * @returns GeneratorConfig object with provider, API key, model, and temperature
 * @throws Error if no API key is found
 */
export function getAIConfig(): GeneratorConfig {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // Check for OpenAI API key first
  if (openaiKey) {
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    return {
      provider: 'openai' as AIProvider,
      apiKey: openaiKey,
      model,
      temperature: 0.3,
    };
  }

  // Check for Anthropic API key
  if (anthropicKey) {
    const model = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
    return {
      provider: 'anthropic' as AIProvider,
      apiKey: anthropicKey,
      model,
      temperature: 0.3,
    };
  }

  // Check for Google API key
  if (googleKey) {
    const model = process.env.AI_MODEL || 'gemini-pro';
    return {
      provider: 'google' as AIProvider,
      apiKey: googleKey,
      model,
      temperature: 0.3,
    };
  }

  // Check for Groq API key
  if (groqKey) {
    const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
    return {
      provider: 'groq' as AIProvider,
      apiKey: groqKey,
      model,
      temperature: 0.3,
    };
  }

  // No API key found
  throw new Error(
    'No API key found. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY/GEMINI_API_KEY, or GROQ_API_KEY in your .env file.\n' +
    'Copy .env.example to .env and add your API key.'
  );
}

/**
 * Ensure required directories exist
 * Creates plans/ and staging/ directories if they don't exist
 */
export function ensureDirectories(): void {
  mkdirSync(PLANS_DIR, { recursive: true });
  mkdirSync(STAGING_DIR, { recursive: true });
  mkdirSync(REPOS_DIR, { recursive: true });
}
