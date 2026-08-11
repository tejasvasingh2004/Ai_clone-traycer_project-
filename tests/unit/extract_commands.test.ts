import { describe, it, expect } from 'vitest';

/** Mirror extractCommands logic from AIAssistant.tsx for unit testing */
function extractCommands(content: string): string[] {
  const commands: string[] = [];
  // Match ```bash ... ``` or ```sh ... ``` blocks
  const fenced = content.matchAll(/```(?:bash|sh|shell)\s*\n([^`]+)```/gi);
  for (const m of fenced) {
    commands.push(...m[1].split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#')));
  }
  // Match lines starting with $
  const dollarLines = content.split('\n').filter(l => l.trim().startsWith('$ '));
  for (const l of dollarLines) {
    commands.push(l.trim().slice(2).trim());
  }
  return [...new Set(commands)];
}

describe('AI Message Command Extraction (extractCommands)', () => {
  it('should extract shell commands from fenced ```bash blocks', () => {
    const text = `To check status, run:
\`\`\`bash
git status
npm test
\`\`\``;
    const result = extractCommands(text);
    expect(result).toEqual(['git status', 'npm test']);
  });

  it('should extract commands from $ prefixed lines', () => {
    const text = `You can run:
$ git status
$ node -v`;
    const result = extractCommands(text);
    expect(result).toEqual(['git status', 'node -v']);
  });

  it('should ignore comment lines starting with # inside fenced blocks', () => {
    const text = `\`\`\`sh
# check version
git --version
\`\`\``;
    const result = extractCommands(text);
    expect(result).toEqual(['git --version']);
  });

  it('should deduplicate commands and return empty array when no commands are present', () => {
    const plainText = 'Here is how you write JavaScript: const a = 1;';
    expect(extractCommands(plainText)).toEqual([]);

    const duplicateText = `
\`\`\`bash
git status
\`\`\`
$ git status`;
    expect(extractCommands(duplicateText)).toEqual(['git status']);
  });
});
