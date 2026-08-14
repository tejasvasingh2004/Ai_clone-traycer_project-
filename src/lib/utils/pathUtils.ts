import { resolve } from 'path';

/** Resolve a relative path inside projectRoot and reject path traversal. */
export function resolveSafeProjectPath(projectRoot: string, relativePath: string): string {
  const root = resolve(projectRoot);
  const target = resolve(root, relativePath);
  if (!target.startsWith(root)) {
    throw new Error('Access denied: path is outside the project directory');
  }
  return target;
}
