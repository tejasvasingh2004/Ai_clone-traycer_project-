import { Plan, StagedProposal, VerificationResult, SystemStatus } from '../types';

const API_BASE = '/api';

export const api = {
  // Plans
  createPlan: async (taskDescription: string, autoGenerate: boolean = false, operationId?: string): Promise<Plan> => {
    const response = await fetch(`${API_BASE}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskDescription, autoGenerate, operationId }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  getPlans: async (): Promise<Plan[]> => {
    const response = await fetch(`${API_BASE}/plans`);
    if (!response.ok) throw new Error('Failed to fetch plans');
    return response.json();
  },

  getPlan: async (id: string): Promise<Plan> => {
    const response = await fetch(`${API_BASE}/plans/${id}`);
    if (!response.ok) throw new Error('Failed to fetch plan');
    return response.json();
  },

  // Generation
  generateCode: async (planId: string, operationId?: string): Promise<{ proposals: StagedProposal[]; count: number }> => {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, operationId }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  // Proposals
  getProposals: async (): Promise<StagedProposal[]> => {
    const response = await fetch(`${API_BASE}/proposals`);
    if (!response.ok) throw new Error('Failed to fetch proposals');
    return response.json();
  },

  getProposal: async (id: string): Promise<StagedProposal> => {
    const response = await fetch(`${API_BASE}/proposals/${id}`);
    if (!response.ok) throw new Error('Failed to fetch proposal');
    return response.json();
  },

  approveProposal: async (id: string): Promise<{ success: boolean; id: string }> => {
    const response = await fetch(`${API_BASE}/approve/${id}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  approveAll: async (): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/approve-all`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  rejectProposal: async (id: string, reason?: string): Promise<{ success: boolean; id: string }> => {
    const response = await fetch(`${API_BASE}/reject/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  cleanProposals: async (): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/clean`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  // Verification
  verifyCode: async (operationId?: string): Promise<VerificationResult> => {
    const response = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationId }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },

  // Status
  getStatus: async (): Promise<SystemStatus> => {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) throw new Error('Failed to fetch status');
    return response.json();
  },

  // SSE
  connectSSE: (operationId: string, onMessage: (data: any) => void, onError?: (error: any) => void): EventSource => {
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
};
