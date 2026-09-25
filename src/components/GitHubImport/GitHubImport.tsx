import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Github,
  Link,
  Star,
  GitFork,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCcw,
  Shield,
  Lock,
  Eye,
  GitBranch,
  Search,
  Filter,
  ArrowRight,
  LogOut,
  Sparkles,
  BookOpen,
  Code2,
  FolderGit2,
  X,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';

// ─── GitHub Connection Persistence ──────────────────────────────────────────
const GH_STORAGE_KEY = 'traycer_github_connected';
const GH_USER_KEY = 'traycer_github_user';

function getStoredConnection(): boolean {
  try {
    return localStorage.getItem(GH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function setStoredConnection(connected: boolean) {
  try {
    if (connected) {
      localStorage.setItem(GH_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(GH_STORAGE_KEY);
      localStorage.removeItem(GH_USER_KEY);
    }
  } catch {}
}

// ─── Mock Data ──────────────────────────────────────────────────────────────
const mockGitHubUser = {
  login: 'johndeveloper',
  name: 'John Developer',
  avatar: null, // We'll use initials
  repos: 42,
  followers: 128,
};

const mockUserRepos = [
  {
    id: 'mock-1',
    name: 'my-portfolio',
    fullName: 'johndeveloper/my-portfolio',
    description: 'Personal portfolio website built with Next.js and Framer Motion',
    stars: 23,
    forks: 5,
    language: 'TypeScript',
    updatedAt: '2 days ago',
    isPrivate: false,
  },
  {
    id: 'mock-2',
    name: 'api-gateway',
    fullName: 'johndeveloper/api-gateway',
    description: 'High-performance API gateway with rate limiting, caching, and auth middleware',
    stars: 156,
    forks: 32,
    language: 'Go',
    updatedAt: '5 hours ago',
    isPrivate: false,
  },
  {
    id: 'mock-3',
    name: 'neural-style-transfer',
    fullName: 'johndeveloper/neural-style-transfer',
    description: 'Real-time neural style transfer using PyTorch with WebSocket streaming',
    stars: 89,
    forks: 14,
    language: 'Python',
    updatedAt: '1 week ago',
    isPrivate: false,
  },
  {
    id: 'mock-4',
    name: 'secrets-vault',
    fullName: 'johndeveloper/secrets-vault',
    description: 'Encrypted secrets management CLI tool for teams',
    stars: 12,
    forks: 2,
    language: 'Rust',
    updatedAt: '3 days ago',
    isPrivate: true,
  },
  {
    id: 'mock-5',
    name: 'react-components-lib',
    fullName: 'johndeveloper/react-components-lib',
    description: 'Reusable, accessible React component library with Storybook docs',
    stars: 340,
    forks: 67,
    language: 'TypeScript',
    updatedAt: '1 day ago',
    isPrivate: false,
  },
  {
    id: 'mock-6',
    name: 'devops-scripts',
    fullName: 'johndeveloper/devops-scripts',
    description: 'Collection of CI/CD pipeline configs, Docker compose files, and K8s manifests',
    stars: 45,
    forks: 8,
    language: 'Shell',
    updatedAt: '4 days ago',
    isPrivate: true,
  },
];

const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  CSS: '#e34c26',
  Rust: '#dea584',
  Go: '#00ADD8',
  Shell: '#89e051',
  Java: '#b07219',
  Ruby: '#701516',
  Swift: '#ffac45',
};

// ─── Permission Scopes Display ──────────────────────────────────────────────
const permissionScopes = [
  { icon: BookOpen, label: 'Read repository metadata', desc: 'Access repo names, descriptions, and stats' },
  { icon: Code2, label: 'Read repository contents', desc: 'Clone and read source code files' },
  { icon: Eye, label: 'Read user profile', desc: 'Access your public profile information' },
];

// ─── Success Particles ──────────────────────────────────────────────────────
function SuccessParticles() {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const x = Math.cos(angle) * 60;
    const y = Math.sin(angle) * 60;
    const colors = ['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#06b6d4', '#f43f5e', '#10b981', '#8b5cf6'];
    return (
      <div
        key={i}
        className="absolute w-2 h-2 rounded-full animate-particle-fade"
        style={{
          backgroundColor: colors[i],
          left: '50%',
          top: '50%',
          transform: `translate(${x}px, ${y}px)`,
          animationDelay: `${i * 0.05}s`,
        }}
      />
    );
  });
  return <div className="absolute inset-0 pointer-events-none">{particles}</div>;
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────
function RepoSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-white/5 animate-shimmer" />
          <div className="w-40 h-4 rounded bg-white/5 animate-shimmer" />
        </div>
        <div className="w-16 h-5 rounded-full bg-white/5 animate-shimmer" />
      </div>
      <div className="w-full h-3 rounded bg-white/5 animate-shimmer mb-2" />
      <div className="w-3/4 h-3 rounded bg-white/5 animate-shimmer mb-4" />
      <div className="flex items-center gap-4">
        <div className="w-16 h-3 rounded bg-white/5 animate-shimmer" />
        <div className="w-12 h-3 rounded bg-white/5 animate-shimmer" />
        <div className="w-12 h-3 rounded bg-white/5 animate-shimmer" />
      </div>
    </div>
  );
}

// ─── Import Progress Steps ──────────────────────────────────────────────────
const importSteps = [
  { label: 'Cloning repository', icon: GitBranch },
  { label: 'Analyzing structure', icon: FolderGit2 },
  { label: 'Building file tree', icon: Code2 },
  { label: 'Ready to edit', icon: Sparkles },
];

function ImportProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="space-y-3">
      {importSteps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = idx === currentStep;
        const isDone = idx < currentStep;
        const isPending = idx > currentStep;

        return (
          <div
            key={step.label}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-500 ${
              isActive
                ? 'bg-blue-500/10 border border-blue-500/20'
                : isDone
                ? 'bg-green-500/5 border border-green-500/10'
                : 'bg-white/[0.02] border border-white/5'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
                isActive
                  ? 'bg-blue-500/20'
                  : isDone
                  ? 'bg-green-500/20'
                  : 'bg-white/5'
              }`}
            >
              {isDone ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : isActive ? (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              ) : (
                <Icon className={`w-4 h-4 ${isPending ? 'text-gray-600' : 'text-gray-400'}`} />
              )}
            </div>
            <span
              className={`text-sm font-medium transition-colors duration-300 ${
                isActive ? 'text-blue-300' : isDone ? 'text-green-400' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
            {isDone && (
              <span className="ml-auto text-[10px] text-green-500/70 font-mono">done</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function GitHubImport() {
  const {
    importRepository,
    repositories,
    fetchRepositories,
    setSelectedRepository,
    setCurrentPage,
    fetchRepositoryFileTree,
  } = useApp();

  // ── Connection State ──────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(getStoredConnection);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(false);

  // ── Repo Browser State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [langFilter, setLangFilter] = useState('all');
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [loadedRepos, setLoadedRepos] = useState(false);

  // ── URL Import State ──────────────────────────────────────────────────
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const importTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Page Title ────────────────────────────────────────────────────────
  useEffect(() => {
    document.title = isConnected ? 'Import Repository — Traycer' : 'Connect GitHub — Traycer';
  }, [isConnected]);

  // ── Fetch repos on connect ────────────────────────────────────────────
  useEffect(() => {
    if (isConnected && !loadedRepos) {
      setIsLoadingRepos(true);
      fetchRepositories();
      // Simulate loading mock repos
      const timer = setTimeout(() => {
        setIsLoadingRepos(false);
        setLoadedRepos(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isConnected, loadedRepos, fetchRepositories]);

  // ── Cleanup import timer ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (importTimerRef.current) clearInterval(importTimerRef.current);
    };
  }, []);

  // ── Connect Handler (Mock OAuth) ──────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);

    // Simulate OAuth redirect + token exchange (2s)
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsConnecting(false);
    setConnectSuccess(true);

    // Brief success animation, then transition
    await new Promise(resolve => setTimeout(resolve, 1500));

    setStoredConnection(true);
    setIsConnected(true);
    setConnectSuccess(false);
  }, []);

  // ── Disconnect Handler ────────────────────────────────────────────────
  const handleDisconnect = useCallback(() => {
    setStoredConnection(false);
    setIsConnected(false);
    setLoadedRepos(false);
    setSearchQuery('');
    setLangFilter('all');
  }, []);

  // ── Import Handler ────────────────────────────────────────────────────
  const handleImport = useCallback(async (repoUrl: string) => {
    if (!repoUrl.trim()) return;

    setIsImporting(true);
    setImportStep(0);
    setImportError(null);
    setImportSuccess(false);

    // Animate through steps while real import happens
    let step = 0;
    importTimerRef.current = setInterval(() => {
      step++;
      if (step < importSteps.length - 1) {
        setImportStep(step);
      }
    }, 800);

    try {
      const result = await importRepository(repoUrl);
      
      // Clear step timer and jump to final step
      if (importTimerRef.current) clearInterval(importTimerRef.current);
      setImportStep(importSteps.length - 1);
      setImportSuccess(true);
      
      await fetchRepositories();

      // Brief pause to show success, then auto-navigate to editor
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate to the VS Code-like editor
      setSelectedRepository(result);
      await fetchRepositoryFileTree(result.id);
      setCurrentPage('repository-editor');
    } catch (error) {
      if (importTimerRef.current) clearInterval(importTimerRef.current);
      const msg = error instanceof Error ? error.message : 'Failed to import repository';
      setImportError(msg);
      setIsImporting(false);
      setImportStep(0);
    }
  }, [importRepository, fetchRepositories, setSelectedRepository, setCurrentPage, fetchRepositoryFileTree]);

  // ── Filter mock repos ─────────────────────────────────────────────────
  const filteredMockRepos = mockUserRepos.filter(repo => {
    const matchesSearch = `${repo.fullName} ${repo.description}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang = langFilter === 'all' || repo.language === langFilter;
    return matchesSearch && matchesLang;
  });

  const allLanguages = [...new Set(mockUserRepos.map(r => r.language))];

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 1: GitHub Auth Connection Screen
  // ═══════════════════════════════════════════════════════════════════════
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 animate-fade-in">
        <div className="max-w-md w-full">
          {/* Animated GitHub Logo */}
          <div className="flex justify-center mb-8 relative">
            {connectSuccess && <SuccessParticles />}
            <div
              className={`relative w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-700 ${
                connectSuccess
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 glow-success animate-scale-bounce'
                  : isConnecting
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 glow-github'
                  : 'bg-gradient-to-br from-gray-700 to-gray-800 animate-float glow-github'
              }`}
            >
              {connectSuccess ? (
                <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-checkmark-draw"
                  />
                </svg>
              ) : isConnecting ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : (
                <Github className="w-10 h-10 text-white" />
              )}

              {/* Ambient glow rings */}
              {!connectSuccess && (
                <>
                  <div className="absolute inset-0 rounded-2xl bg-purple-500/10 animate-pulse-slow" />
                  <div className="absolute -inset-2 rounded-3xl border border-purple-500/10 animate-pulse-slow" style={{ animationDelay: '0.5s' }} />
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              {connectSuccess ? 'Connected!' : isConnecting ? 'Connecting...' : 'Connect to GitHub'}
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              {connectSuccess
                ? 'Your GitHub account has been linked successfully.'
                : isConnecting
                ? 'Authenticating with GitHub and verifying permissions...'
                : 'Link your GitHub account to browse and import your repositories directly.'}
            </p>
          </div>

          {/* Auth Card */}
          {!isConnecting && !connectSuccess && (
            <div className="space-y-4 animate-fade-in">
              {/* Permission Scopes */}
              <div className="p-4 rounded-xl glass border border-white/5 space-y-3">
                <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
                  Permissions requested
                </p>
                {permissionScopes.map((scope) => {
                  const Icon = scope.icon;
                  return (
                    <div key={scope.label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{scope.label}</p>
                        <p className="text-xs text-gray-500">{scope.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Connect Button */}
              <button
                id="github-connect-btn"
                onClick={handleConnect}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 border border-white/10 text-white font-semibold text-sm hover:from-gray-700 hover:to-gray-600 hover:border-white/20 transition-all duration-300 group"
              >
                <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Connect with GitHub</span>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </button>

              {/* Security Note */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                <Shield className="w-3.5 h-3.5" />
                <span>Secure OAuth 2.0 • We never store your password</span>
              </div>
            </div>
          )}

          {/* Connecting State */}
          {isConnecting && (
            <div className="space-y-6 animate-fade-in">
              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-progress-pulse" style={{ width: '70%', transition: 'width 2s ease-out' }} />
              </div>

              <div className="flex items-center justify-center gap-3 p-4 rounded-xl glass border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Verifying OAuth token</p>
                  <p className="text-xs text-gray-500">Securely connecting to GitHub API...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 2 & 3: Repo Browser + Import
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header with Connected User */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Import from GitHub</h1>
          <p className="text-gray-400">Browse your repositories or paste a URL to import.</p>
        </div>

        {/* Connected User Badge */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass border border-white/5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
            JD
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">{mockGitHubUser.name}</p>
            <p className="text-[11px] text-gray-500">@{mockGitHubUser.login}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-[10px] text-green-400 font-medium">Connected</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="ml-1 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Disconnect GitHub"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Import Modal Overlay — shows during import */}
      {isImporting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="w-full max-w-md p-8 rounded-2xl glass border border-white/10 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-1">
                {importSuccess ? 'Import Complete!' : 'Importing Repository'}
              </h2>
              <p className="text-sm text-gray-400">
                {importSuccess
                  ? 'Opening in editor...'
                  : 'Setting up your repository workspace...'}
              </p>
            </div>

            <ImportProgress currentStep={importStep} />

            {importSuccess && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-400 animate-scale-bounce">
                <Sparkles className="w-4 h-4" />
                <span>Redirecting to code editor...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* URL Import Section */}
      <div className="p-6 rounded-xl glass border border-white/5">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Link className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">Import by URL</span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                id="github-url-input"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (importError) setImportError(null);
                }}
                placeholder="https://github.com/owner/repository"
                className="w-full pl-4 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim()) handleImport(url);
                }}
              />
            </div>
            <button
              id="github-import-btn"
              onClick={() => handleImport(url)}
              disabled={isImporting || !url.trim()}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center gap-2 group"
            >
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              Import
            </button>
          </div>

          {importError && (
            <div
              role="alert"
              className="text-xs text-red-400 flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <pre className="whitespace-pre-wrap break-words font-sans flex-1">{importError}</pre>
              <button onClick={() => setImportError(null)} className="text-red-400/60 hover:text-red-400 flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Your Repositories Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Your Repositories</h2>
            <span className="text-xs text-gray-500 font-mono px-2 py-0.5 rounded bg-white/5">
              {mockUserRepos.length} repos
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={langFilter}
                onChange={(e) => setLangFilter(e.target.value)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                <option value="all">All Languages</option>
                {allLanguages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 focus-within:border-blue-500/30 transition-colors">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repos..."
                className="bg-transparent text-white text-xs placeholder-gray-600 outline-none w-32"
              />
            </div>
          </div>
        </div>

        {/* Repo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoadingRepos ? (
            <>
              <RepoSkeleton />
              <RepoSkeleton />
              <RepoSkeleton />
              <RepoSkeleton />
            </>
          ) : (
            filteredMockRepos.map((repo, idx) => (
              <button
                key={repo.id}
                onClick={() => {
                  setUrl(`https://github.com/${repo.fullName}`);
                }}
                className="p-5 rounded-xl glass border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left group animate-stagger-in"
                style={{ animationDelay: `${idx * 0.06}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-white text-sm group-hover:text-blue-400 transition-colors">
                      {repo.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {repo.isPrivate && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <Lock className="w-2.5 h-2.5" />
                        Private
                      </span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">{repo.description}</p>

                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: languageColors[repo.language] || '#6b7280' }} />
                    <span>{repo.language}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    <span>{repo.stars}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GitFork className="w-3 h-3" />
                    <span>{repo.forks}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    <span>{repo.updatedAt}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {!isLoadingRepos && filteredMockRepos.length === 0 && (
          <div className="p-8 rounded-xl glass border border-white/5 text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No repositories match your search</p>
          </div>
        )}
      </div>

      {/* Recent Imports */}
      {repositories.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recently Imported</h2>
            <button
              onClick={() => fetchRepositories()}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="space-y-2">
            {repositories.slice(0, 5).map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium text-sm">{repo.name}</p>
                    <p className="text-[11px] text-gray-500 font-mono">{repo.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {repo.status === 'importing' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                      <span className="text-xs text-yellow-400">Importing...</span>
                    </div>
                  ) : repo.status === 'error' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs text-red-400">Error</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedRepository(repo);
                        fetchRepositoryFileTree(repo.id);
                        setCurrentPage('repository-editor');
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      Open in Editor
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
