import type { Plan } from '../types.js';

const DELETE_STEP_PATTERN = /\b(delete|remove|unlink|drop)\b/i;
const DELETE_TASK_PATTERN = /\b(delete|remove)\b/i;

export function isDeleteStep(step: string): boolean {
  return DELETE_STEP_PATTERN.test(step);
}

/** Resolve which plan files should be deleted (explicit list or inferred from steps/task). */
export function resolveFilesToDelete(plan: Plan): string[] {
  if (Array.isArray(plan.filesToDelete) && plan.filesToDelete.length > 0) {
    return [...new Set(plan.filesToDelete)];
  }

  const deletes = new Set<string>();

  for (const file of plan.filesToModify) {
    const fileName = (file.split('/').pop() || file).toLowerCase();
    for (const step of plan.steps) {
      const stepLower = step.toLowerCase();
      if (isDeleteStep(step) && stepLower.includes(fileName)) {
        deletes.add(file);
      }
    }
  }

  if (DELETE_TASK_PATTERN.test(plan.taskName)) {
    for (const file of plan.filesToModify) {
      const fileName = (file.split('/').pop() || file).toLowerCase();
      if (plan.steps.some(step => step.toLowerCase().includes(fileName))) {
        deletes.add(file);
      }
    }
  }

  return [...deletes];
}
