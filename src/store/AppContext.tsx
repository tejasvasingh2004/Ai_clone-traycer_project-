import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  Workspace,
  Repository,
  FileNode,
  ChatMessage,
  ChatSession,
  Deployment,
  TerminalEntry,
  PageType
} from '../types';
import { Plan, StagedProposal, VerificationResult, SystemStatus } from '../types/backend';
import { api } from '../api/client';

interface AppState {
  currentPage: PageType;
  currentWorkspace: Workspace | null;
  currentRepository: Repository | null;
  selectedRepository: Repository | null;
  repositoryFileTree: any[];
  editorMode: 'default' | 'fullscreen';
  selectedFile: any | null;
  currentFile: FileNode | null;
  sidebarCollapsed: boolean;
  aiPanelOpen: boolean;
  terminalOpen: boolean;
  terminalMinimized: boolean;
  workspaces: Workspace[];
  repositories: Repository[];
  files: FileNode[];
  chatSessions: ChatSession[];
  currentChatSession: ChatSession | null;
  chatMessages: ChatMessage[];
  terminalEntries: TerminalEntry[];
  deployments: Deployment[];
  plans: Plan[];
  proposals: StagedProposal[];
  systemStatus: SystemStatus | null;
  verificationResult: VerificationResult | null;
  streamingLogs: string[];
  isLoading: boolean;
  selectedPlanId: string | null;
  gitStatus: { files: string[]; count: number } | null;
  sidebarTab: 'explorer' | 'search' | 'source-control';
  lastGeneratedPlan: Plan | null;
  attachedFiles: Array<{ path: string; name: string; content: string }>;
  savedTaskSessions: Array<{ id: string; name: string; timestamp: string; messages: ChatMessage[]; plan: Plan | null }>;
}

interface AppContextType extends AppState {
  setCurrentPage: (page: PageType) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentRepository: (repo: Repository | null) => void;
  setSelectedRepository: (repo: Repository | null) => void;
  setRepositoryFileTree: (tree: any[]) => void;
  setEditorMode: (mode: 'default' | 'fullscreen') => void;
  setSelectedFile: (file: any | null) => void;
  setCurrentFile: (file: FileNode | null) => void;
  toggleSidebar: () => void;
  toggleAiPanel: () => void;
  toggleTerminal: () => void;
  setTerminalMinimized: (minimized: boolean) => void;
  addWorkspace: (workspace: Workspace) => void;
  addRepository: (repo: Repository) => void;
  addChatMessage: (message: ChatMessage) => void;
  addTerminalEntry: (entry: TerminalEntry) => void;
  clearTerminal: () => void;
  importRepository: (url: string) => Promise<Repository>;
  fetchStatus: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchProposals: () => Promise<void>;
  fetchRepositories: () => Promise<void>;
  fetchRepositoryFileTree: (repositoryId: string) => Promise<void>;
  toggleFileTreeNode: (nodeId: string) => void;
  createPlan: (description: string, autoGenerate?: boolean, operationId?: string) => Promise<Plan>;
  generateCode: (planId: string, operationId?: string) => Promise<{ proposals: StagedProposal[]; count: number }>;
  approveProposal: (id: string) => Promise<{ success: boolean; id: string }>;
  approveAll: () => Promise<{
    success: boolean;
    approved: number;
    failed: number;
    files: string[];
    deleted: string[];
    modified: string[];
    failures: Array<{ filePath: string; error: string }>;
    proposals: StagedProposal[];
  }>;
  rejectProposal: (id: string, reason?: string) => Promise<{ success: boolean; id: string }>;
  cleanProposals: () => Promise<{ success: boolean }>;
  verifyCode: (operationId?: string) => Promise<VerificationResult>;
  runTerminalCommand: (repositoryId: string, command: string) => Promise<{ output: string; status: 'completed' | 'error' }>;
  connectSSE: (operationId: string, onMessage: (data: any) => void, onError?: (error: any) => void) => EventSource;
  waitForSSEConnection: (eventSource: EventSource, timeoutMs?: number) => Promise<void>;
  addStreamingLog: (msg: string) => void;
  clearStreamingLogs: () => void;
  clearChatMessages: () => void;
  removeRepository: (id: string) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  updateTerminalEntry: (id: string, updates: Partial<TerminalEntry>) => void;
  rollbackProposal: (id: string) => Promise<{ success: boolean; id: string }>;
  setSelectedPlanId: (id: string | null) => void;
  setSidebarTab: (tab: 'explorer' | 'search' | 'source-control') => void;
  fetchGitStatus: (repositoryId: string) => Promise<{ files: string[]; count: number } | null>;
  createFile: (repositoryId: string, filePath: string) => Promise<void>;
  createFolder: (repositoryId: string, folderPath: string) => Promise<void>;
  collapseAllNodes: () => void;
  attachFile: (file: { path: string; name: string; content: string }) => void;
  detachFile: (path: string) => void;
  clearAttachedFiles: () => void;
  setLastGeneratedPlan: (plan: Plan | null) => void;
  gitStageFile: (repositoryId: string, filePath: string) => Promise<void>;
  gitUnstageFile: (repositoryId: string, filePath: string) => Promise<void>;
  gitDiscardFile: (repositoryId: string, filePath: string) => Promise<void>;
  gitCommit: (repositoryId: string, message: string) => Promise<{ success: boolean; output: string }>;
  startNewTask: () => void;
  loadTaskSession: (sessionId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentPage: 'dashboard',
    currentWorkspace: null,
    currentRepository: null,
    selectedRepository: null,
    repositoryFileTree: [],
    editorMode: 'default',
    selectedFile: null,
    currentFile: null,
    sidebarCollapsed: false,
    aiPanelOpen: true,
    terminalOpen: false,
    terminalMinimized: false,
    workspaces: [],
    repositories: [],
    files: [],
    chatSessions: [],
    currentChatSession: null,
    chatMessages: [],
    terminalEntries: [],
    deployments: [],
    plans: [],
    proposals: [],
    systemStatus: null,
    verificationResult: null,
    streamingLogs: [],
    isLoading: false,
    selectedPlanId: null,
    gitStatus: null,
    sidebarTab: 'explorer',
    lastGeneratedPlan: null,
    attachedFiles: [],
    savedTaskSessions: [],
  });

  useEffect(() => {
    const pageIds: PageType[] = [
      'dashboard',
      'workspaces',
      'repositories',
      'templates',
      'deployments',
      'settings',
      'workspace',
      'plan-creator',
      'verify',
      'history',
      'github-import',
      'repository-editor',
    ];

    const syncPageFromHash = async () => {
      const hash = window.location.hash.replace('#', '');

      if (hash.startsWith('repository-editor')) {
        const repoId = hash.split(':')[1];

        setState(prev => {
          if (prev.currentPage === 'repository-editor') {
            return prev;
          }
          return { ...prev, currentPage: 'repository-editor' };
        });

        if (repoId) {
          try {
            const response = await fetch('/api/repositories');
            if (response.ok) {
              const repos = await response.json();
              const repo = repos.find((r: any) => r.id === repoId);
              if (repo) {
                const treeResponse = await fetch(`/api/repositories/${repoId}/files`);
                const tree = treeResponse.ok ? await treeResponse.json() : [];
                setState(prev => ({
                  ...prev,
                  repositories: repos,
                  selectedRepository: repo,
                  repositoryFileTree: tree
                }));
              }
            }
          } catch (e) {
            console.error('Failed to sync repo editor from hash', e);
          }
        }
        return;
      }

      if (pageIds.includes(hash as PageType)) {
        setState(prev => (prev.currentPage === hash ? prev : { ...prev, currentPage: hash as PageType }));
      }
    };

    syncPageFromHash();
    window.addEventListener('hashchange', syncPageFromHash);

    return () => {
      window.removeEventListener('hashchange', syncPageFromHash);
    };
  }, []);

  const setCurrentPage = useCallback((page: PageType) => {
    setState(prev => {
      let hash = page === 'dashboard' ? '' : page;
      if (page === 'repository-editor' && prev.selectedRepository) {
        hash = `repository-editor:${prev.selectedRepository.id}`;
      }
      if (window.location.hash.replace('#', '') !== hash) {
        window.location.hash = hash;
      }
      return { ...prev, currentPage: page };
    });
  }, []);

  const setCurrentWorkspace = useCallback((workspace: Workspace | null) => {
    setState(prev => ({ ...prev, currentWorkspace: workspace }));
  }, []);

  const setCurrentRepository = useCallback((repo: Repository | null) => {
    setState(prev => ({ ...prev, currentRepository: repo }));
  }, []);

  const setCurrentFile = useCallback((file: FileNode | null) => {
    setState(prev => ({ ...prev, currentFile: file }));
  }, []);

  const setSelectedRepository = useCallback((repo: Repository | null) => {
    setState(prev => {
      if (prev.currentPage === 'repository-editor' && repo) {
        const hash = `repository-editor:${repo.id}`;
        if (window.location.hash.replace('#', '') !== hash) {
          window.location.hash = hash;
        }
      }
      return { ...prev, selectedRepository: repo };
    });
  }, []);

  const setRepositoryFileTree = useCallback((tree: any[]) => {
    setState(prev => ({ ...prev, repositoryFileTree: tree }));
  }, []);

  const setEditorMode = useCallback((mode: 'default' | 'fullscreen') => {
    setState(prev => ({ ...prev, editorMode: mode }));
  }, []);

  const setSelectedFile = useCallback((file: any | null) => {
    setState(prev => ({ ...prev, selectedFile: file }));
  }, []);

  const fetchRepositoryFileTree = useCallback(async (repositoryId: string) => {
    try {
      const tree = await api.getRepositoryFileTree(repositoryId);
      setRepositoryFileTree(tree);
    } catch (error) {
      console.error('Failed to fetch repository file tree:', error);
    }
  }, [setRepositoryFileTree]);

  const toggleFileTreeNode = useCallback((nodeId: string) => {
    setState(prev => {
      const toggleNode = (nodes: any[]): any[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children) {
            return { ...node, children: toggleNode(node.children) };
          }
          return node;
        });
      };
      return { ...prev, repositoryFileTree: toggleNode(prev.repositoryFileTree) };
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const toggleAiPanel = useCallback(() => {
    setState(prev => ({ ...prev, aiPanelOpen: !prev.aiPanelOpen }));
  }, []);

  const toggleTerminal = useCallback(() => {
    setState(prev => ({ ...prev, terminalOpen: !prev.terminalOpen }));
  }, []);

  const setTerminalMinimized = useCallback((minimized: boolean) => {
    setState(prev => ({ ...prev, terminalMinimized: minimized }));
  }, []);

  const addWorkspace = useCallback((workspace: Workspace) => {
    setState(prev => ({ ...prev, workspaces: [...prev.workspaces, workspace] }));
  }, []);

  const addRepository = useCallback((repo: Repository) => {
    setState(prev => ({ ...prev, repositories: [...prev.repositories, repo] }));
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setState(prev => ({ ...prev, chatMessages: [...prev.chatMessages, message] }));
  }, []);

  const addTerminalEntry = useCallback((entry: TerminalEntry) => {
    setState(prev => ({ ...prev, terminalEntries: [...prev.terminalEntries, entry] }));
  }, []);

  const updateTerminalEntry = useCallback((id: string, updates: Partial<TerminalEntry>) => {
    setState(prev => ({
      ...prev,
      terminalEntries: prev.terminalEntries.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  }, []);

  const clearTerminal = useCallback(() => {
    setState(prev => ({ ...prev, terminalEntries: [] }));
  }, []);

  const importRepository = useCallback(async (url: string): Promise<Repository> => {
    const id = Date.now().toString();
    addTerminalEntry({
      id: `${id}-1`,
      command: `git clone ${url}`,
      output: 'Cloning repository...',
      status: 'running',
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await api.importRepository(url);
      addRepository(result);

      addTerminalEntry({
        id: `${id}-2`,
        command: '',
        output: `Repository cloned successfully: ${result.name}`,
        status: 'completed',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      addTerminalEntry({
        id: `${id}-2`,
        command: '',
        output: `Error: ${error instanceof Error ? error.message : 'Failed to import repository'}`,
        status: 'error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }, [addRepository, addTerminalEntry]);

  const fetchStatus = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const status = await api.getStatus();
      setState(prev => ({ ...prev, systemStatus: status, isLoading: false }));
    } catch (error) {
      console.error('Failed to fetch status:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const plans = await api.getPlans();
      setState(prev => ({ ...prev, plans, isLoading: false }));
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const fetchProposals = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const proposals = await api.getProposals();
      setState(prev => ({ ...prev, proposals, isLoading: false }));
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const removeRepository = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await api.deleteRepository(id);
      setState(prev => ({
        ...prev,
        repositories: prev.repositories.filter(r => r.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to delete repository:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const deletePlan = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await api.deletePlan(id);
      setState(prev => ({
        ...prev,
        plans: prev.plans.filter(p => p.id !== id),
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to delete plan:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const fetchRepositories = useCallback(async () => {
    try {
      const response = await fetch('/api/repositories');
      if (response.ok) {
        const data = await response.json();
        console.log('APP_CONTEXT REPOS FETCHED:', data);
        setState(prev => ({ ...prev, repositories: data }));
      } else {
        console.error('APP_CONTEXT REPOS FETCH FAILED STATUS:', response.status);
      }
    } catch (e) {
      console.error('Failed to fetch repositories', e);
    }
  }, []);

  const createPlan = useCallback(async (description: string, autoGenerate: boolean = false, operationId?: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const repoId = state.selectedRepository?.id;
      const plan = await api.createPlan(description, autoGenerate, operationId, repoId);
      setState(prev => ({ ...prev, plans: [...prev.plans, plan], isLoading: false }));
      return plan;
    } catch (error) {
      console.error('Failed to create plan:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.selectedRepository?.id]);

  const generateCode = useCallback(async (planId: string, operationId?: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const repoId = state.selectedRepository?.id;
      const result = await api.generateCode(planId, operationId, repoId);
      const proposals = Array.isArray(result.proposals) ? result.proposals : [];
      setState(prev => ({ ...prev, proposals, isLoading: false }));
      return { proposals, count: result.count ?? proposals.length };
    } catch (error) {
      console.error('Failed to generate code:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.selectedRepository?.id]);

  const approveProposal = useCallback(async (id: string) => {
    try {
      const repoId = state.selectedRepository?.id;
      const result = await api.approveProposal(id, repoId);
      setState(prev => ({
        ...prev,
        proposals: prev.proposals.map(p => p.id === id ? { ...p, approved: true } : p)
      }));
      return result;
    } catch (error) {
      console.error('Failed to approve proposal:', error);
      throw error;
    }
  }, [state.selectedRepository?.id]);

  const approveAll = useCallback(async () => {
    try {
      const repoId = state.selectedRepository?.id;
      const result = await api.approveAll(repoId);
      const approvedProposals = Array.isArray(result.proposals) ? result.proposals : [];
      setState(prev => {
        const existing = Array.isArray(prev.proposals) ? prev.proposals : [];
        if (approvedProposals.length === 0) {
          return { ...prev, proposals: existing.map(p => ({ ...p, approved: true })) };
        }
        const approvedIds = new Set(approvedProposals.map(p => p.id));
        const merged = existing.map(p =>
          approvedIds.has(p.id) ? { ...p, approved: true } : p
        );
        for (const p of approvedProposals) {
          if (!merged.some(m => m.id === p.id)) merged.push(p);
        }
        return { ...prev, proposals: merged };
      });
      return result;
    } catch (error) {
      console.error('Failed to approve all:', error);
      throw error;
    }
  }, [state.selectedRepository?.id]);

  const rejectProposal = useCallback(async (id: string, reason?: string) => {
    try {
      const result = await api.rejectProposal(id, reason);
      setState(prev => ({
        ...prev,
        proposals: prev.proposals.map(p => p.id === id ? { ...p, approved: false } : p)
      }));
      return result;
    } catch (error) {
      console.error('Failed to reject proposal:', error);
      throw error;
    }
  }, []);

  const rollbackProposal = useCallback(async (id: string) => {
    try {
      const result = await api.rollbackProposal(id);
      setState(prev => ({
        ...prev,
        proposals: prev.proposals.map(p => p.id === id ? { ...p, approved: false } : p)
      }));
      return result;
    } catch (error) {
      console.error('Failed to rollback proposal:', error);
      throw error;
    }
  }, []);

  const setSelectedPlanId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedPlanId: id }));
  }, []);

  const cleanProposals = useCallback(async () => {
    try {
      const result = await api.cleanProposals();
      setState(prev => ({ ...prev, proposals: [] }));
      return result;
    } catch (error) {
      console.error('Failed to clean proposals:', error);
      throw error;
    }
  }, []);

  const verifyCode = useCallback(async (operationId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, verificationResult: null }));
    try {
      const result = await api.verifyCode(operationId, state.selectedRepository?.id);
      setState(prev => ({ ...prev, verificationResult: result, isLoading: false }));
      return result;
    } catch (error) {
      console.error('Failed to verify code:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.selectedRepository?.id]);

  const runTerminalCommand = useCallback(async (repositoryId: string, command: string) => {
    return api.runTerminalCommand(repositoryId, command);
  }, []);

  const connectSSE = useCallback((operationId: string, onMessage: (data: any) => void, onError?: (error: any) => void) => {
    return api.connectSSE(operationId, onMessage, onError);
  }, []);

  const waitForSSEConnection = useCallback((eventSource: EventSource, timeoutMs: number = 5000) => {
    return api.waitForSSEConnection(eventSource, timeoutMs);
  }, []);

  const addStreamingLog = useCallback((msg: string) => {
    setState(prev => ({ ...prev, streamingLogs: [...prev.streamingLogs, msg] }));
  }, []);

  const clearStreamingLogs = useCallback(() => {
    setState(prev => ({ ...prev, streamingLogs: [] }));
  }, []);

  const clearChatMessages = useCallback(() => {
    setState(prev => ({ ...prev, chatMessages: [] }));
  }, []);

  const setSidebarTab = useCallback((tab: 'explorer' | 'search' | 'source-control') => {
    setState(prev => ({ ...prev, sidebarTab: tab }));
  }, []);

  const attachFile = useCallback((file: { path: string; name: string; content: string }) => {
    setState(prev => {
      if (prev.attachedFiles.some(f => f.path === file.path)) return prev;
      return { ...prev, attachedFiles: [...prev.attachedFiles, file] };
    });
  }, []);

  const detachFile = useCallback((path: string) => {
    setState(prev => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter(f => f.path !== path),
    }));
  }, []);

  const clearAttachedFiles = useCallback(() => {
    setState(prev => ({ ...prev, attachedFiles: [] }));
  }, []);

  const setLastGeneratedPlan = useCallback((plan: Plan | null) => {
    setState(prev => ({ ...prev, lastGeneratedPlan: plan }));
  }, []);

  const gitStageFile = useCallback(async (repositoryId: string, filePath: string) => {
    await api.gitStageFile(repositoryId, filePath);
    const status = await api.getGitStatus(repositoryId);
    setState(prev => ({ ...prev, gitStatus: status }));
  }, []);

  const gitUnstageFile = useCallback(async (repositoryId: string, filePath: string) => {
    await api.gitUnstageFile(repositoryId, filePath);
    const status = await api.getGitStatus(repositoryId);
    setState(prev => ({ ...prev, gitStatus: status }));
  }, []);

  const gitDiscardFile = useCallback(async (repositoryId: string, filePath: string) => {
    await api.gitDiscardFile(repositoryId, filePath);
    const status = await api.getGitStatus(repositoryId);
    const tree = await api.getRepositoryFileTree(repositoryId);
    setState(prev => ({ ...prev, gitStatus: status, repositoryFileTree: tree }));
  }, []);

  const gitCommit = useCallback(async (repositoryId: string, message: string) => {
    const res = await api.gitCommit(repositoryId, message);
    const status = await api.getGitStatus(repositoryId);
    setState(prev => ({ ...prev, gitStatus: status }));
    return res;
  }, []);

  const startNewTask = useCallback(() => {
    setState(prev => {
      // Archive current session if it has messages
      if (prev.chatMessages.length > 0) {
        const sessionName = prev.lastGeneratedPlan?.taskName || prev.chatMessages[0]?.content.slice(0, 30) || 'Task Session';
        const newSession = {
          id: Date.now().toString(),
          name: sessionName,
          timestamp: new Date().toISOString(),
          messages: prev.chatMessages,
          plan: prev.lastGeneratedPlan,
        };
        return {
          ...prev,
          chatMessages: [],
          lastGeneratedPlan: null,
          attachedFiles: [],
          savedTaskSessions: [newSession, ...prev.savedTaskSessions],
        };
      }
      return {
        ...prev,
        chatMessages: [],
        lastGeneratedPlan: null,
        attachedFiles: [],
      };
    });
  }, []);

  const loadTaskSession = useCallback((sessionId: string) => {
    setState(prev => {
      const session = prev.savedTaskSessions.find(s => s.id === sessionId);
      if (!session) return prev;
      return {
        ...prev,
        chatMessages: session.messages,
        lastGeneratedPlan: session.plan,
      };
    });
  }, []);

  const fetchGitStatus = useCallback(async (repositoryId: string) => {
    try {
      const status = await api.getGitStatus(repositoryId);
      setState(prev => ({ ...prev, gitStatus: status }));
      return status;
    } catch (error) {
      console.error('Failed to fetch git status:', error);
      return null;
    }
  }, []);

  const createFile = useCallback(async (repositoryId: string, filePath: string) => {
    await api.createFile(repositoryId, filePath);
    // Refresh the file tree after creation
    const tree = await api.getRepositoryFileTree(repositoryId);
    setState(prev => ({ ...prev, repositoryFileTree: tree }));
  }, []);

  const createFolder = useCallback(async (repositoryId: string, folderPath: string) => {
    await api.createFolder(repositoryId, folderPath);
    const tree = await api.getRepositoryFileTree(repositoryId);
    setState(prev => ({ ...prev, repositoryFileTree: tree }));
  }, []);

  const collapseAllNodes = useCallback(() => {
    const collapseAll = (nodes: any[]): any[] =>
      nodes.map(node => ({
        ...node,
        isExpanded: false,
        children: node.children ? collapseAll(node.children) : undefined,
      }));
    setState(prev => ({ ...prev, repositoryFileTree: collapseAll(prev.repositoryFileTree) }));
  }, []);

  const value: AppContextType = {
    ...state,
    setCurrentPage,
    setCurrentWorkspace,
    setCurrentRepository,
    setCurrentFile,
    toggleSidebar,
    toggleAiPanel,
    toggleTerminal,
    setTerminalMinimized,
    addWorkspace,
    addRepository,
    addChatMessage,
    addTerminalEntry,
    clearTerminal,
    importRepository,
    fetchStatus,
    fetchPlans,
    fetchProposals,
    fetchRepositories,
    createPlan,
    generateCode,
    approveProposal,
    approveAll,
    rejectProposal,
    cleanProposals,
    verifyCode,
    runTerminalCommand,
    connectSSE,
    waitForSSEConnection,
    addStreamingLog,
    clearStreamingLogs,
    clearChatMessages,
    removeRepository,
    deletePlan,
    updateTerminalEntry,
    rollbackProposal,
    setSelectedPlanId,
    // New editor methods
    setSelectedRepository,
    setRepositoryFileTree,
    setEditorMode,
    setSelectedFile,
    fetchRepositoryFileTree,
    toggleFileTreeNode,
    setSidebarTab,
    fetchGitStatus,
    createFile,
    createFolder,
    collapseAllNodes,
    attachFile,
    detachFile,
    clearAttachedFiles,
    setLastGeneratedPlan,
    gitStageFile,
    gitUnstageFile,
    gitDiscardFile,
    gitCommit,
    startNewTask,
    loadTaskSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
