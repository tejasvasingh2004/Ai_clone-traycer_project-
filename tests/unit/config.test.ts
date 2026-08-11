import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAIConfig, ensureDirectories, PLANS_DIR, STAGING_DIR, REPOS_DIR } from '../../src/config.ts';
import { existsSync, rmSync } from 'fs';

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.AI_MODEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAIConfig', () => {
    it('should return OpenAI config when OPENAI_API_KEY is present', () => {
      process.env.OPENAI_API_KEY = 'sk-mock-openai-key';
      const config = getAIConfig();
      expect(config.provider).toBe('openai');
      expect(config.apiKey).toBe('sk-mock-openai-key');
      expect(config.model).toBe('gpt-4o-mini');
      expect(config.temperature).toBe(0.3);
    });

    it('should return Anthropic config when ANTHROPIC_API_KEY is present', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-mock-key';
      const config = getAIConfig();
      expect(config.provider).toBe('anthropic');
      expect(config.apiKey).toBe('sk-ant-mock-key');
      expect(config.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should return Google config when GOOGLE_API_KEY or GEMINI_API_KEY is present', () => {
      process.env.GEMINI_API_KEY = 'google-gemini-mock-key';
      const config = getAIConfig();
      expect(config.provider).toBe('google');
      expect(config.apiKey).toBe('google-gemini-mock-key');
      expect(config.model).toBe('gemini-pro');
    });

    it('should return Groq config when GROQ_API_KEY is present', () => {
      process.env.GROQ_API_KEY = 'gsk_mock_groq_key';
      const config = getAIConfig();
      expect(config.provider).toBe('groq');
      expect(config.apiKey).toBe('gsk_mock_groq_key');
      expect(config.model).toBe('llama-3.3-70b-versatile');
    });

    it('should respect custom AI_MODEL environment variable', () => {
      process.env.OPENAI_API_KEY = 'sk-mock-openai-key';
      process.env.AI_MODEL = 'gpt-4o';
      const config = getAIConfig();
      expect(config.model).toBe('gpt-4o');
    });

    it('should throw an error when no API key is set', () => {
      expect(() => getAIConfig()).toThrow(/No API key found/);
    });
  });

  describe('ensureDirectories', () => {
    it('should create required directories if they do not exist', () => {
      ensureDirectories();
      expect(existsSync(PLANS_DIR)).toBe(true);
      expect(existsSync(STAGING_DIR)).toBe(true);
      expect(existsSync(REPOS_DIR)).toBe(true);
    });
  });
});
