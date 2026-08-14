import { Plan, StagedProposal, VerificationResult, SystemStatus } from '../types/backend';
import type { Repository } from '../types';
import { authService } from '../services/auth';

const API_BASE = '/api';

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authService.getAccessToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);

  if (response.status === 401 && !url.includes('/api/auth/')) {
    try {
      const newToken = await authService.refreshToken();
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, { ...config, headers });
    } catch (e) {
      // Refresh failed, let the original 401 response pass through or force logout
      authService.logout();
    }
  }

  return response;
}

export const api = {
  // Plans
  createPlan: async (taskDescription: string, autoGenerate: boolean = false, operationId?: string, repositoryId?: string): Promise<Plan> => {
    const response = await authFetch(`${API_BASE}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskDescription, autoGenerate, operationId, repositoryId }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  getPlans: async (): Promise<Plan[]> => {
    const response = await authFetch(`${API_BASE}/plans`);
    if (!response.ok) throw new Error('Failed to fetch plans');
    return response.json();
  },

  
  getPlan: async (id: string): Promise<Plan> => {
    const response = await authFetch(`${API_BASE}/plans/${id}`);
    if (!response.ok) throw new Error('Failed to fetch plan');
    return response.json();
  },

  deletePlan: async (id: string): Promise<{ success: boolean; id: string }> => {
    const response = await authFetch(`${API_BASE}/plans/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error((await response.json()).error || 'Failed to delete plan');
    }
    return response.json();
  },

  revertPlan: async (id: string, repositoryId?: string): Promise<{ success: boolean; reverted: string[]; failed: string[] }> => {
    const response = await authFetch(`${API_BASE}/plans/${id}/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositoryId }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to revert plan');
    }
    return response.json();
  },

  importRepository: async (url: string): Promise<Repository> => {
    const response = await authFetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      let errorMsg = 'Failed to import repository';
      try {
        const body = await response.json();
        errorMsg = body.error || body.message || errorMsg;
      } catch {
        const text = await response.text();
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    return response.json();
  },

  deleteRepository: async (id: string): Promise<{ success: boolean; id: string }> => {
    const response = await authFetch(`${API_BASE}/repositories/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error((await response.json()).error || 'Failed to delete repository');
    }
    return response.json();
  },
  getRepositories: async (): Promise<Repository[]> => {
    const response = await authFetch(`${API_BASE}/repositories`);
    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }
    return response.json();
  },

  // Get file tree for a repository
  getRepositoryFileTree: async (repositoryId: string): Promise<any[]> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/files`);
    if (!response.ok) {
      throw new Error('Failed to fetch repository file tree');
    }
    return response.json();
  },

  // Get file content
  getFileContent: async (repositoryId: string, filePath: string): Promise<string> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/files/${filePath}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${filePath}`);
    }
    const data = await response.json();
    return data.content;
  },

  // Save file content
  saveFileContent: async (repositoryId: string, filePath: string, content: string): Promise<void> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/files/${filePath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error(`Failed to save file content: ${filePath}`);
    }
  },

  // Run terminal command in repository
  runTerminalCommand: async (repositoryId: string, command: string): Promise<{ output: string; status: 'completed' | 'error' }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/terminal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    });
    if (!response.ok) {
      throw new Error('Failed to run terminal command');
    }
    return response.json();
  },

  // Create a new empty file inside a repository
  createFile: async (repositoryId: string, filePath: string): Promise<{ success: boolean; path: string }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/create-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to create file');
    return response.json();
  },

  // Create a new folder inside a repository
  createFolder: async (repositoryId: string, folderPath: string): Promise<{ success: boolean; path: string }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/create-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to create folder');
    return response.json();
  },

  // Get git status for the repository
  getGitStatus: async (repositoryId: string): Promise<{ files: string[]; count: number }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/git-status`);
    if (!response.ok) throw new Error('Failed to fetch git status');
    return response.json();
  },

  // Real repository content search
  searchRepository: async (repositoryId: string, query: string): Promise<{ results: Array<{ path: string; line: number; text: string }> }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error('Failed to search repository');
    return response.json();
  },

  // Git Stage file
  gitStageFile: async (repositoryId: string, filePath: string): Promise<{ success: boolean }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/git-stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    if (!response.ok) throw new Error('Failed to stage file');
    return response.json();
  },

  // Git Unstage file
  gitUnstageFile: async (repositoryId: string, filePath: string): Promise<{ success: boolean }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/git-unstage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    if (!response.ok) throw new Error('Failed to unstage file');
    return response.json();
  },

  // Git Discard changes
  gitDiscardFile: async (repositoryId: string, filePath: string): Promise<{ success: boolean }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/git-discard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    if (!response.ok) throw new Error('Failed to discard changes');
    return response.json();
  },

  // Git Commit
  gitCommit: async (repositoryId: string, message: string): Promise<{ success: boolean; output: string }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/git-commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to commit changes');
    return response.json();
  },

  // AI Generate commit message
  gitGenerateCommitMsg: async (repositoryId: string): Promise<{ message: string }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/git-generate-commit-msg`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to generate commit message');
    return response.json();
  },

  // Get file git diff
  getGitFileDiff: async (repositoryId: string, filePath: string): Promise<{ diff: string }> => {
    const response = await authFetch(`${API_BASE}/repositories/${repositoryId}/git-file-diff?path=${encodeURIComponent(filePath)}`);
    if (!response.ok) throw new Error('Failed to fetch file diff');
    return response.json();
  },




  // Generation
  generateCode: async (planId: string, operationId?: string, repositoryId?: string): Promise<{ proposals: StagedProposal[]; count: number; operationId?: string }> => {
    const response = await authFetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, operationId, repositoryId }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    const data = await response.json();
    return {
      proposals: Array.isArray(data.proposals) ? data.proposals : [],
      count: typeof data.count === 'number' ? data.count : (Array.isArray(data.proposals) ? data.proposals.length : 0),
      operationId: data.operationId,
    };
  },

  // Proposals
  getProposals: async (): Promise<StagedProposal[]> => {
    const response = await authFetch(`${API_BASE}/proposals`);
    if (!response.ok) throw new Error('Failed to fetch proposals');
    return response.json();
  },

  getProposal: async (id: string): Promise<StagedProposal> => {
    const response = await authFetch(`${API_BASE}/proposals/${id}`);
    if (!response.ok) throw new Error('Failed to fetch proposal');
    return response.json();
  },

  approveProposal: async (id: string, repositoryId?: string): Promise<{ success: boolean; id: string }> => {
    const response = await authFetch(`${API_BASE}/approve/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositoryId }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  approveAll: async (repositoryId?: string): Promise<{
    success: boolean;
    approved: number;
    failed: number;
    files: string[];
    deleted: string[];
    modified: string[];
    failures: Array<{ filePath: string; error: string }>;
    proposals: StagedProposal[];
  }> => {
    const response = await authFetch(`${API_BASE}/approve-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositoryId }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    const data = await response.json();
    return {
      success: Boolean(data.success),
      approved: typeof data.approved === 'number' ? data.approved : 0,
      failed: typeof data.failed === 'number' ? data.failed : 0,
      files: Array.isArray(data.files) ? data.files : [],
      deleted: Array.isArray(data.deleted) ? data.deleted : [],
      modified: Array.isArray(data.modified) ? data.modified : [],
      failures: Array.isArray(data.failures) ? data.failures : [],
      proposals: Array.isArray(data.proposals) ? data.proposals : [],
    };
  },

  rejectProposal: async (id: string, reason?: string): Promise<{ success: boolean; id: string }> => {
    const response = await authFetch(`${API_BASE}/reject/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  rollbackProposal: async (id: string): Promise<{ success: boolean; id: string }> => {
    const response = await authFetch(`${API_BASE}/rollback/${id}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  cleanProposals: async (): Promise<{ success: boolean }> => {
    const response = await authFetch(`${API_BASE}/clean`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  // Verification
  verifyCode: async (operationId?: string, repositoryId?: string): Promise<VerificationResult> => {
    const response = await authFetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationId, repositoryId }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  // Status
  getStatus: async (): Promise<SystemStatus> => {
    const response = await authFetch(`${API_BASE}/status`);
    if (!response.ok) throw new Error('Failed to fetch status');
    return response.json();
  },

  // SSE
  connectSSE: (operationId: string, onMessage: (data: unknown) => void, onError?: (error: unknown) => void): EventSource => {
    const eventSource = new EventSource(`${API_BASE}/stream/${operationId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      if (onError) onError(error);
      eventSource.close();
    };

    return eventSource;
  },

  waitForSSEConnection: (eventSource: EventSource, timeoutMs: number = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        eventSource.close();
        reject(new Error('Timed out waiting for SSE connection'));
      }, timeoutMs);

      eventSource.addEventListener('open', () => {
        window.clearTimeout(timeoutId);
        resolve();
      }, { once: true });

      eventSource.onerror = (error) => {
        window.clearTimeout(timeoutId);
        eventSource.close();
        reject(error instanceof Error ? error : new Error('Failed to open SSE connection'));
      };
    });
  },
};
