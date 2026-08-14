export interface Plan {
  id: string;
  taskName: string;
  steps: string[];
  filesToModify: string[];
  filesToDelete?: string[];
  createdAt: string;
  rationale?: string;
  dependencyOrder?: string[];
  contextSnapshot?: {
    projectSummary: string;
    existingPatterns: {
      importStyle: string;
      namingConvention: string;
      testFramework: string;
    };
  };
}

export interface StagedProposal {
  id: string;
  planId: string;
  filePath: string;
  newContent: string;
  diff: string;
  operation: 'create' | 'modify' | 'delete';
  approved: boolean;
  createdAt: string;
  rejectionHistory?: Array<{
    reason: string;
    timestamp: string;
  }>;
  generationContext?: string[];
  aiReviewSummary?: string;
  originalContent?: string | null;
}

export interface VerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export interface SystemStatus {
  plans: number;
  proposals: number;
  approved: number;
  pending: number;
}
