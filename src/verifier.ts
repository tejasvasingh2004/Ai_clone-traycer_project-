/**
 * Verification module for Traycer-mini
 * Runs TypeScript and ESLint checks on the codebase
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { access, constants, readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { VerificationResult } from './types.js';
import { STAGING_DIR, STAGING_INDEX_FILE } from './config.js';

const execAsync = promisify(exec);

/**
 * Parse TypeScript compiler output and extract error messages
 */
export function parseTypeScriptErrors(output: string): string[] {
  const errors: string[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Match pattern: filename(line,col): error TS\d+: message
    if (line.match(/.*\(\d+,\d+\):\s*error\s+TS\d+:/)) {
      errors.push(line.trim());
    }
  }
  
  return errors;
}

/**
 * Parse ESLint JSON output and extract errors and warnings
 */
export function parseESLintOutput(jsonOutput: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const results = JSON.parse(jsonOutput);
    
    if (Array.isArray(results)) {
      for (const result of results) {
        const filePath = result.filePath || 'unknown';
        
        if (result.messages && Array.isArray(result.messages)) {
          for (const message of result.messages) {
            const location = `${filePath}:${message.line}:${message.column}`;
            const formattedMessage = `${location} - ${message.message} (${message.ruleId || 'unknown'})`;
            
            if (message.severity === 2) {
              errors.push(formattedMessage);
            } else if (message.severity === 1) {
              warnings.push(formattedMessage);
            }
          }
        }
      }
    }
  } catch (error) {
    // If JSON parsing fails, return empty arrays
    console.warn(chalk.yellow('Warning: Failed to parse ESLint output'));
  }
  
  return { errors, warnings };
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
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
 * Check import resolution for a file
 * @param filePath - File path to check
 * @param projectRoot - Project root directory
 * @returns Array of unresolved import errors
 */
async function checkImportResolution(filePath: string, projectRoot: string): Promise<string[]> {
  const errors: string[] = [];
  
  try {
    const content = await readFile(join(projectRoot, filePath), 'utf-8');
    const imports = parseImports(content);
    
    for (const imp of imports) {
      // Skip node_modules and built-in modules
      if (imp.startsWith('.') || imp.startsWith('/')) {
        // Resolve relative import
        const importPath = join(projectRoot, filePath, '..', imp);
        
        // Try with common extensions
        const extensions = ['.ts', '.js', '.tsx', '.jsx', '/index.ts', '/index.js'];
        let resolved = false;
        
        for (const ext of extensions) {
          if (await fileExists(importPath + ext)) {
            resolved = true;
            break;
          }
        }
        
        // Check if it's a directory
        if (!resolved && await fileExists(importPath)) {
          resolved = true;
        }
        
        if (!resolved) {
          errors.push(`${filePath}: Cannot find module '${imp}'`);
        }
      }
    }
  } catch (error) {
    // File might not exist or be readable
  }
  
  return errors;
}

/**
 * Get proposal ID for a file path
 * @param filePath - File path to look up
 * @returns Proposal ID or null
 */
async function getProposalForFile(filePath: string): Promise<string | null> {
  try {
    const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
    const indexData = JSON.parse(indexContent);
    const entry = indexData.find((e: { filePath: string }) => e.filePath === filePath);
    return entry?.id || null;
  } catch {
    return null;
  }
}

/**
 * Get actionable suggestion for common error patterns
 * @param error - Error message
 * @returns Suggested fix or null
 */
export function getSuggestedFix(error: string): string | null {
  if (error.includes('Cannot find module')) {
    return 'This import doesn\'t exist. Run "traycer-mini clean" and regenerate.';
  }
  if (error.includes('Property') && error.includes('does not exist on type')) {
    return 'Type mismatch. Consider regenerating with updated type context.';
  }
  if (error.includes('TS2307') || error.includes('TS2304')) {
    return 'Module or type not found. Check if dependencies are installed.';
  }
  if (error.includes('TS2339')) {
    return 'Property does not exist on type. Verify type definitions.';
  }
  return null;
}

/**
 * Display verification results with formatting
 */
async function displayResults(result: VerificationResult): Promise<void> {
  console.log(''); // Empty line for spacing
  
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(chalk.green('✓ All checks passed!'));
    return;
  }
  
  if (result.errors.length > 0) {
    console.log(chalk.red(`✗ ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''} found`));
    console.log('');
    console.log(chalk.red.bold('Errors:'));
    
    // Group errors by file
    const errorsByFile = new Map<string, string[]>();
    for (const error of result.errors) {
      const match = error.match(/^([^:]+):/);
      const file = match ? match[1] : 'unknown';
      
      if (!errorsByFile.has(file)) {
        errorsByFile.set(file, []);
      }
      errorsByFile.get(file)!.push(error);
    }
    
    for (const [file, fileErrors] of errorsByFile) {
      console.log(chalk.red(`\n  ${file}:`));
      
      // Get proposal ID for error-to-proposal linking
      const proposalId = await getProposalForFile(file);
      if (proposalId) {
        console.log(chalk.gray(`    Proposal: ${proposalId}`));
      }
      
      for (const error of fileErrors) {
        console.log(chalk.red(`    ${error}`));
        
        // Add actionable suggestion
        const suggestion = getSuggestedFix(error);
        if (suggestion) {
          console.log(chalk.cyan(`    💡 ${suggestion}`));
        }
      }
    }
    console.log('');
  }
  
  if (result.warnings.length > 0) {
    console.log(chalk.yellow(`⚠ ${result.warnings.length} warning${result.warnings.length !== 1 ? 's' : ''} found`));
    console.log('');
    console.log(chalk.yellow.bold('Warnings:'));
    
    // Group warnings by file
    const warningsByFile = new Map<string, string[]>();
    for (const warning of result.warnings) {
      const match = warning.match(/^([^:]+):/);
      const file = match ? match[1] : 'unknown';
      
      if (!warningsByFile.has(file)) {
        warningsByFile.set(file, []);
      }
      warningsByFile.get(file)!.push(warning);
    }
    
    for (const [file, fileWarnings] of warningsByFile) {
      console.log(chalk.yellow(`\n  ${file}:`));
      for (const warning of fileWarnings) {
        console.log(chalk.yellow(`    ${warning}`));
      }
    }
    console.log('');
  }
}

/**
 * Run TypeScript and ESLint checks on the codebase
 * Returns verification result with errors and warnings
 */
export async function verifyCode(): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: false,
    errors: [],
    warnings: []
  };
  
  let spinner: Ora | null = null;
  
  try {
    // Check TypeScript
    spinner = ora('Running TypeScript checks...').start();
    
    const tsconfigExists = await fileExists(join(process.cwd(), 'tsconfig.json'));
    
    if (!tsconfigExists) {
      spinner.warn('tsconfig.json not found - skipping TypeScript check');
    } else {
      try {
        // Execute tsc --noEmit
        const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        
        // If we get here, tsc succeeded (exit code 0)
        // But still check output for any messages
        const output = stdout + stderr;
        if (output.trim()) {
          const errors = parseTypeScriptErrors(output);
          result.errors.push(...errors);
        }
      } catch (error: unknown) {
        // tsc returns non-zero exit code when there are errors
        const execError = error as { code?: string; message?: string; stdout?: string; stderr?: string };
        if (execError.code === 'ENOENT' || execError.message?.includes('command not found')) {
          spinner.warn('TypeScript (tsc) not found - skipping TypeScript check');
          spinner.info('Install TypeScript with: npm install -D typescript');
        } else {
          // Parse errors from output
          const output = (execError.stdout || '') + (execError.stderr || '');
          const errors = parseTypeScriptErrors(output);
          result.errors.push(...errors);
        }
      }
    }
    
    // Check ESLint
    if (spinner) {
      spinner.text = 'Running ESLint checks...';
    }
    
    const eslintrcExists = await fileExists(join(process.cwd(), '.eslintrc.json'));
    const eslintConfigExists = await fileExists(join(process.cwd(), 'eslint.config.js'));
    
    if (!eslintrcExists && !eslintConfigExists) {
      if (spinner) {
        spinner.info('ESLint config not found - skipping ESLint check');
      }
    } else {
      try {
        // Execute eslint with JSON format
        const { stdout } = await execAsync('npx eslint src --ext .ts --format json', {
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        
        const { errors, warnings } = parseESLintOutput(stdout);
        result.errors.push(...errors);
        result.warnings.push(...warnings);
      } catch (error: unknown) {
        const execError = error as { code?: string; message?: string; stdout?: string };
        if (execError.code === 'ENOENT' || execError.message?.includes('command not found')) {
          if (spinner) {
            spinner.warn('ESLint not found - skipping ESLint check');
            spinner.info('Install ESLint with: npm install -D eslint');
          }
        } else {
          // ESLint returns non-zero exit code when there are errors
          // But we still get JSON output in stdout
          if (execError.stdout) {
            const { errors, warnings } = parseESLintOutput(execError.stdout);
            result.errors.push(...errors);
            result.warnings.push(...warnings);
          }
        }
      }
    }
    
    // Stop spinner
    if (spinner) {
      spinner.stop();
    }
    
    // Check import resolution for recently modified files
    if (spinner) {
      spinner.text = 'Checking import resolution...';
      spinner.start();
    }
    
    try {
      const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
      const indexData = JSON.parse(indexContent);
      
      for (const entry of indexData) {
        const importErrors = await checkImportResolution(entry.filePath, process.cwd());
        result.errors.push(...importErrors);
      }
    } catch {
      // No staging index or no proposals, skip import check
    }
    
    if (spinner) {
      spinner.stop();
    }
    
    // Set success flag (true if no errors, warnings are acceptable)
    result.success = result.errors.length === 0;
    
    // Display results
    await displayResults(result);
    
    return result;
  } catch (error: unknown) {
    if (spinner) {
      spinner.fail('Verification failed');
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('Error during verification:'), errorMessage);

    result.success = false;
    result.errors.push(`Verification error: ${errorMessage}`);

    return result;
  }
}