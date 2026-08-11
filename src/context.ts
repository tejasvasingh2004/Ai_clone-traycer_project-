/**
 * Context Engine for Traycer-mini
 * Reads and understands the codebase before any AI call is made
 */

import { readFile, readdir, access } from 'fs/promises';
import { join, relative, extname } from 'path';

/**
 * Represents a file with its content and relevance reason
 */
export interface RelevantFile {
  path: string;
  content: string;
  reason: string;
}

/**
 * Represents code patterns detected in the project
 */
export interface ExistingPatterns {
  importStyle: 'esm' | 'commonjs' | 'mixed';
  namingConvention: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case';
  testFramework: 'jest' | 'vitest' | 'mocha' | 'none';
}

/**
 * Context bundle containing all information needed for AI generation
 */
export interface ContextBundle {
  taskDescription: string;
  relevantFiles: RelevantFile[];
  importGraph: Record<string, string[]>;
  projectSummary: string;
  existingPatterns: ExistingPatterns;
}

/**
 * Get all files in the project directory recursively
 * @param dir - Directory to scan
 * @returns Promise<string[]> - Array of file paths relative to dir
 */
async function getProjectFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir, { recursive: true });
  return files
    .map(f => f.toString())
    .filter(f => 
      !f.includes('node_modules') && 
      !f.includes('.git') &&
      !f.includes('dist') &&
      !f.includes('.next') &&
      !f.includes('coverage')
    );
}

/**
 * Parse import statements from file content
 * @param content - File content
 * @returns Array of imported module paths
 */
function parseImports(content: string): string[] {
  const imports: string[] = [];
  
  // Match ES6 imports: import ... from '...' or import "..."
  const esmImportRegex = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = esmImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Match CommonJS requires: require('...')
  const commonjsRegex = /require\(['"]([^'"]+)['"]\)/g;
  while ((match = commonjsRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Build import graph for all project files
 * @param projectFiles - Array of file paths
 * @param projectRoot - Project root directory
 * @returns Record mapping file path to its dependencies
 */
async function buildImportGraph(
  projectFiles: string[],
  projectRoot: string
): Promise<Record<string, string[]>> {
  const graph: Record<string, string[]> = {};
  
  for (const file of projectFiles) {
    // Only process TypeScript and JavaScript files
    if (!/\.(ts|js|tsx|jsx)$/.test(file)) {
      continue;
    }
    
    try {
      const fullPath = join(projectRoot, file);
      const content = await readFile(fullPath, 'utf-8');
      const imports = parseImports(content);
      
      // Keep only local imports (relative paths or alias paths)
      // Exclude external package specifiers entirely
      const localImports = imports.filter(imp => 
        imp.startsWith('.') || 
        imp.startsWith('@/'));
      
      // Resolve each import relative to the importing file and normalize to project-root path
      const resolvedImports: string[] = [];
      for (const imp of localImports) {
        let resolvedPath: string;
        
        if (imp.startsWith('@/')) {
          // Handle alias paths like @/utils/helper
          // Remove @/ prefix and treat as relative to project root
          resolvedPath = imp.replace(/^\@\//, '');
        } else {
          // Resolve relative imports like ./utils/helper or ../types
          const fileDir = file.substring(0, file.lastIndexOf('/') || file.lastIndexOf('\\'));
          resolvedPath = relative(projectRoot, join(projectRoot, fileDir, imp));
        }
        
        // Normalize path separators to forward slashes for consistency
        resolvedPath = resolvedPath.replace(/\\/g, '/');
        
        // Only include if the resolved path exists in project files
        if (projectFiles.includes(resolvedPath)) {
          resolvedImports.push(resolvedPath);
        }
      }
      
      graph[file] = resolvedImports;
    } catch (error) {
      // File might not be readable, skip it
      graph[file] = [];
    }
  }
  
  return graph;
}

/**
 * Detect existing code patterns in the project
 * @param projectFiles - Array of file paths
 * @param projectRoot - Project root directory
 * @returns Detected patterns
 */
async function detectPatterns(
  projectFiles: string[],
  projectRoot: string
): Promise<ExistingPatterns> {
  let esmCount = 0;
  let commonjsCount = 0;
  let camelCaseCount = 0;
  let snakeCaseCount = 0;
  let pascalCaseCount = 0;
  let kebabCaseCount = 0;
  
  const tsFiles = projectFiles.filter(f => /\.(ts|js|tsx|jsx)$/.test(f));
  
  for (const file of tsFiles.slice(0, 20)) { // Sample first 20 files
    try {
      const fullPath = join(projectRoot, file);
      const content = await readFile(fullPath, 'utf-8');
      
      // Detect import style
      if (content.includes('import ') && content.includes(' from ')) {
        esmCount++;
      }
      if (content.includes('require(')) {
        commonjsCount++;
      }
      
      // Detect naming convention from function/class names
      const camelCaseRegex = /\b[a-z][a-zA-Z0-9]*\b/g;
      const snakeCaseRegex = /\b[a-z][a-z0-9_]*\b/g;
      const pascalCaseRegex = /\b[A-Z][a-zA-Z0-9]*\b/g;
      
      const camelMatches = content.match(camelCaseRegex);
      const snakeMatches = content.match(snakeCaseRegex);
      const pascalMatches = content.match(pascalCaseRegex);
      
      if (camelMatches) camelCaseCount += camelMatches.length;
      if (snakeMatches) snakeCaseCount += snakeMatches.length;
      if (pascalMatches) pascalCaseCount += pascalMatches.length;
    } catch (error) {
      // Skip unreadable files
    }
  }
  
  // Determine import style
  let importStyle: ExistingPatterns['importStyle'] = 'mixed';
  if (esmCount > commonjsCount * 2) importStyle = 'esm';
  else if (commonjsCount > esmCount * 2) importStyle = 'commonjs';
  
  // Determine naming convention
  let namingConvention: ExistingPatterns['namingConvention'] = 'camelCase';
  if (snakeCaseCount > camelCaseCount && snakeCaseCount > pascalCaseCount) {
    namingConvention = 'snake_case';
  } else if (pascalCaseCount > camelCaseCount && pascalCaseCount > snakeCaseCount) {
    namingConvention = 'PascalCase';
  }
  
  // Detect test framework from package.json
  let testFramework: ExistingPatterns['testFramework'] = 'none';
  try {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    
    if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
      testFramework = 'jest';
    } else if (packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest) {
      testFramework = 'vitest';
    } else if (packageJson.devDependencies?.mocha || packageJson.dependencies?.mocha) {
      testFramework = 'mocha';
    }
  } catch (error) {
    // package.json not found or invalid
  }
  
  return {
    importStyle,
    namingConvention,
    testFramework
  };
}

/**
 * Generate a compact project summary
 * @param projectFiles - Array of file paths
 * @param projectRoot - Project root directory
 * @returns Project summary string
 */
async function generateProjectSummary(
  projectFiles: string[],
  projectRoot: string
): Promise<string> {
  const tsFiles = projectFiles.filter(f => /\.(ts|tsx)$/.test(f));
  const jsFiles = projectFiles.filter(f => /\.(js|jsx)$/.test(f));
  const testFiles = projectFiles.filter(f => 
    f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__')
  );
  
  // Read package.json for project info
  let projectName = 'Unknown';
  let projectDescription = '';
  try {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    projectName = packageJson.name || projectName;
    projectDescription = packageJson.description || '';
  } catch (error) {
    // package.json not found
  }
  
  // Count files by directory
  const dirCounts: Record<string, number> = {};
  for (const file of projectFiles) {
    const dir = file.split('/')[0] || file.split('\\')[0] || 'root';
    dirCounts[dir] = (dirCounts[dir] || 0) + 1;
  }
  
  const summary = `Project: ${projectName}
Description: ${projectDescription}
Structure: ${Object.keys(dirCounts).length} main directories (${Object.entries(dirCounts).map(([d, c]) => `${d}(${c})`).join(', ')})
Files: ${tsFiles.length} TypeScript, ${jsFiles.length} JavaScript, ${testFiles.length} test files`;
  
  return summary;
}

/**
 * Score file relevance to task description using keyword matching
 * @param filePath - File path
 * @param taskDescription - Task description
 * @returns Relevance score (0-1)
 */
function scoreRelevance(filePath: string, taskDescription: string): number {
  const taskKeywords = taskDescription
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);
  
  const filePathLower = filePath.toLowerCase();
  let score = 0;
  
  for (const keyword of taskKeywords) {
    if (filePathLower.includes(keyword)) {
      score += 0.3;
    }
  }
  
  // Bonus for common directories
  if (filePathLower.includes('src')) score += 0.1;
  if (filePathLower.includes('utils')) score += 0.1;
  if (filePathLower.includes('types')) score += 0.15;
  if (filePathLower.includes('config')) score += 0.1;
  
  return Math.min(score, 1);
}

/**
 * Build context bundle for a given task
 * @param taskDescription - Natural language description of the task
 * @param projectRoot - Project root directory (defaults to process.cwd())
 * @returns Context bundle with relevant files and project information
 */
export async function buildContext(
  taskDescription: string,
  projectRoot: string = process.cwd()
): Promise<ContextBundle> {
  if (taskDescription.length > 15000) {
    throw new Error('Your request plus repository context exceeds the model limit - try a smaller request');
  }

  // Get all project files
  const projectFiles = await getProjectFiles(projectRoot);
  
  // Always include baseline files
  const baselineFiles = ['package.json', 'tsconfig.json', 'src/types.ts'];
  const relevantFiles: RelevantFile[] = [];
  
  // Add baseline files if they exist
  for (const file of baselineFiles) {
    try {
      const fullPath = join(projectRoot, file);
      await access(fullPath);
      const content = await readFile(fullPath, 'utf-8');
      let truncated = content;
      if (content.length > 1500) {
        truncated = content.split('\n').slice(0, 40).join('\n') + '\n... (truncated)';
      }
      relevantFiles.push({
        path: file,
        content: truncated,
        reason: 'Baseline configuration file'
      });
    } catch (error) {
      // File doesn't exist, skip it
    }
  }
  
  // Score and rank files by relevance
  const scoredFiles = projectFiles
    .filter(f => /\.(ts|js|tsx|jsx|json)$/.test(f))
    .map(f => ({
      path: f,
      score: scoreRelevance(f, taskDescription)
    }))
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // Add top relevant files (up to 5, excluding baseline files already added)
  const maxRelevantFiles = 5;
  for (const { path } of scoredFiles.slice(0, maxRelevantFiles)) {
    if (baselineFiles.includes(path)) continue;
    
    try {
      const fullPath = join(projectRoot, path);
      const content = await readFile(fullPath, 'utf-8');
      
      // Include top 40 lines if file > 1500 characters
      let fileContent = content;
      if (content.length > 1500) {
        const lines = content.split('\n');
        fileContent = lines.slice(0, 40).join('\n') + '\n... (truncated)';
      }
      
      relevantFiles.push({
        path,
        content: fileContent,
        reason: `Relevant to task (score: ${scoreRelevance(path, taskDescription).toFixed(2)})`
      });
    } catch (error) {
      // File not readable, skip
    }
  }
  
  // Build import graph
  const importGraph = await buildImportGraph(projectFiles, projectRoot);
  
  // Generate project summary
  const projectSummary = await generateProjectSummary(projectFiles, projectRoot);
  
  // Detect existing patterns
  const existingPatterns = await detectPatterns(projectFiles, projectRoot);
  
  return {
    taskDescription,
    relevantFiles,
    importGraph,
    projectSummary,
    existingPatterns
  };
}

/**
 * Get context as a formatted string for AI prompts
 * @param context - Context bundle
 * @returns Formatted context string (max 20,000 characters)
 */
export function contextToString(context: ContextBundle): string {
  let output = `Task: ${context.taskDescription}\n\n`;
  output += `Project Summary:\n${context.projectSummary}\n\n`;
  output += `Existing Patterns:\n`;
  output += `- Import Style: ${context.existingPatterns.importStyle}\n`;
  output += `- Naming Convention: ${context.existingPatterns.namingConvention}\n`;
  output += `- Test Framework: ${context.existingPatterns.testFramework}\n\n`;
  output += `Relevant Files:\n`;
  
  for (const file of context.relevantFiles) {
    output += `\n--- ${file.path} (${file.reason}) ---\n`;
    output += file.content;
    output += '\n';
  }
  
  output += `\nImport Graph:\n`;
  for (const [file, imports] of Object.entries(context.importGraph)) {
    if (imports.length > 0) {
      output += `${file} -> ${imports.join(', ')}\n`;
    }
  }
  
  // Hard cap context to 20,000 characters max
  if (output.length > 20000) {
    output = output.substring(0, 20000) + '\n... (context budget reached)';
  }
  
  return output;
}
