export interface Workspace {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  github_id: string | null;
  description: string;
  language: string;
  stars: number;
  is_private: boolean;
  status: 'importing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
  fileTree?: FileTreeNode[];
}

export interface FileNode {
  id: string;
  repository_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content: string;
  language: string;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
  children?: FileNode[];
}

// New interface representing a node in the repository file tree
export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  isExpanded?: boolean;
  content?: string;
  language?: string;
}

export interface ChatSession {
  id: string;
  workspace_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Deployment {
  id: string;
  workspace_id: string;
  repository_id: string | null;
  url: string | null;
  status: 'building' | 'deployed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  type: 'import' | 'deploy' | 'chat' | 'edit' | 'create';
  title: string;
  description: string;
  timestamp: string;
  workspace_id?: string;
  repository_id?: string;
}

export interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  status: 'running' | 'completed' | 'error';
  timestamp: string;
}

export type PageType = 'dashboard' | 'workspaces' | 'repositories' | 'templates' | 'deployments' | 'settings' | 'workspace' | 'plan-creator' | 'verify' | 'history' | 'github-import' | 'repository-editor';
