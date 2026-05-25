"use strict";
/**
 * Configuration module for Traycer-mini
 * Manages environment variables and AI provider settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAGING_INDEX_FILE = exports.STAGING_DIR = exports.PLANS_DIR = void 0;
exports.getAIConfig = getAIConfig;
exports.ensureDirectories = ensureDirectories;
var dotenv_1 = require("dotenv");
var fs_1 = require("fs");
dotenv_1.default.config();
/**
 * Directory paths for plans and staging
 */
exports.PLANS_DIR = './plans';
exports.STAGING_DIR = './staging';
exports.STAGING_INDEX_FILE = './staging/index.json';
/**
 * Get AI configuration from environment variables
 * @returns GeneratorConfig object with provider, API key, model, and temperature
 * @throws Error if no API key is found
 */
function getAIConfig() {
    var openaiKey = process.env.OPENAI_API_KEY;
    var anthropicKey = process.env.ANTHROPIC_API_KEY;
    var googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    // Check for OpenAI API key first
    if (openaiKey) {
        var model = process.env.AI_MODEL || 'gpt-4o-mini';
        return {
            provider: 'openai',
            apiKey: openaiKey,
            model: model,
            temperature: 0.3,
        };
    }
    // Check for Anthropic API key
    if (anthropicKey) {
        var model = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
        return {
            provider: 'anthropic',
            apiKey: anthropicKey,
            model: model,
            temperature: 0.3,
        };
    }
    // Check for Google API key
    if (googleKey) {
        var model = process.env.AI_MODEL || 'gemini-pro';
        return {
            provider: 'google',
            apiKey: googleKey,
            model: model,
            temperature: 0.3,
        };
    }
    // No API key found
    throw new Error('No API key found. Please set either OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY/GEMINI_API_KEY in your .env file.\n' +
        'Copy .env.example to .env and add your API key.');
}
/**
 * Ensure required directories exist
 * Creates plans/ and staging/ directories if they don't exist
 */
function ensureDirectories() {
    (0, fs_1.mkdirSync)(exports.PLANS_DIR, { recursive: true });
    (0, fs_1.mkdirSync)(exports.STAGING_DIR, { recursive: true });
}
