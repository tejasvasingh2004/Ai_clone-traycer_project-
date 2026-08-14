/**
 * JSON utility functions for Traycer-mini
 * Provides robust JSON and code extraction from AI responses that may include markdown formatting
 */

/**
 * Extract content from text that may be wrapped in markdown code fences
 * Handles multiple fence patterns: ```json, ```typescript, ```javascript, ```js, ```ts, ```, etc.
 * @param text - Text that may contain code/JSON wrapped in markdown
 * @returns Extracted content string without markdown fences
 */
export function extractJSON(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let extracted = text.trim();

  // Try to match markdown code blocks with language specifiers
  const codeBlockRegex = /```(?:json|typescript|javascript|js|ts)?\n([\s\S]*?)\n```/;
  const match = extracted.match(codeBlockRegex);
  
  if (match && match[1]) {
    extracted = match[1].trim();
  }

  return extracted;
}

/**
 * Extract code from text that may be wrapped in markdown code fences
 * Handles multiple fence patterns: ```typescript, ```ts, ```javascript, ```js, ```, etc.
 * @param text - Text that may contain code wrapped in markdown
 * @returns Extracted code string without markdown fences
 */
export function extractCode(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let extracted = text.trim();

  // Try to match markdown code blocks with language specifiers
  const codeBlockRegex = /```(?:typescript|ts|javascript|js)?\n([\s\S]*?)\n```/;
  const match = extracted.match(codeBlockRegex);
  
  if (match && match[1]) {
    extracted = match[1].trim();
  }

  return extracted;
}

/**
 * Safely parse JSON with fallback for markdown-wrapped responses
 * @param text - Text that may contain JSON
 * @returns Parsed JSON object or null if parsing fails
 */
export function safeParseJSON<T = any>(text: string): T | null {
  try {
    const extracted = extractJSON(text);
    return JSON.parse(extracted) as T;
  } catch (error) {
    return null;
  }
}
