import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useApp } from '../../store/AppContext';

const popularRepos = [
  {
    id: '1',
    name: 'vercel/next.js',
    description: 'The React Framework for the Web',
    stars: 124000,
    forks: 26700,
    language: 'JavaScript',
    lastUpdated: '2 hours ago',
  },
  {
    id: '2',
    name: 'facebook/react',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
    stars: 227000,
    forks: 46700,
    language: 'JavaScript',
    lastUpdated: '5 hours ago',
  },
  {
    id: '3',
    name: 'tailwindlabs/tailwindcss',
    description: 'A utility-first CSS framework for rapid UI development.',
    stars: 82000,
    forks: 4100,
    language: 'CSS',
    lastUpdated: '1 day ago',
  },
  {
    id: '4',
    name: 'supabase/supabase',
    description: 'The open source Firebase alternative. Follow to get the latest updates.',
    stars: 74000,
    forks: 6900,
    language: 'TypeScript',
    lastUpdated: '3 hours ago',
  },
];

const languageColors: Record<string, string> = {
  JavaScript: 'bg-yellow-400',
  TypeScript: 'bg-blue-500',
  Python: 'bg-green-500',
  CSS: 'bg-pink-400',
  Rust: 'bg-orange-500',
  Go: 'bg-cyan-500',
};

export function GitHubImport() {
  const { importRepository, repositories, fetchRepositories } = useApp();
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  useEffect(() => {
    if (importStatus === 'error' && errorMessage) {
      document.title = `Import Error — Traycer`;
    } else if (importStatus === 'importing') {
      document.title = 'Importing Repository — Traycer';
    } else {
      document.title = 'Import from GitHub — Traycer';
    }
  }, [importStatus, errorMessage]);

  const handleImport = async () => {
    if (!url.trim()) return;

    setIsImporting(true);
    setImportStatus('importing');
    setErrorMessage(null);

    try {
      await importRepository(url);
      setImportStatus('success');
      setUrl('');
      await fetchRepositories();

      setTimeout(() => {
        setImportStatus('idle');
        setIsImporting(false);
      }, 2000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to import repository';
      setErrorMessage(msg);
      setImportStatus('error');
      setTimeout(() => {
        setImportStatus('idle');
        setIsImporting(false);
      }, 4000);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-white mb-2">Import from GitHub</h1>
        <p className="text-gray-400">Import your repositories and start coding with AI assistance.</p>
      </div>

      {/* Import Section */}
      <div className="p-8 rounded-xl glass border border-white/5">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* GitHub Connect */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                <Github className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">GitHub Link (Mock)</p>
                <p className="text-sm text-gray-400">@johndeveloper (Illustrative Only)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Illustrative</span>
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-white">Repository URL</label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="https://github.com/owner/repo"
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={handleImport}
                disabled={isImporting || !url.trim()}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {importStatus === 'importing' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importing...
                  </>
                ) : importStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Imported!
                  </>
                ) : importStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Error
                  </>
                ) : (
                  <>
                    Import Repository
                  </>
                )}
              </button>
            </div>
            {errorMessage ? (
              <div
                role="alert"
                className="text-xs text-red-400 flex items-start gap-2 mt-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 max-h-48 overflow-y-auto"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <pre className="whitespace-pre-wrap break-words font-sans flex-1">{errorMessage}</pre>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Enter the full GitHub URL of the repository you want to import
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Popular Repositories */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Popular Repositories (Illustrative list)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {popularRepos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => setUrl(`https://github.com/${repo.name}`)}
              className="p-5 rounded-xl glass border border-white/5 hover:border-white/10 transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-white group-hover:text-blue-400 transition-colors">
                    {repo.name}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{repo.description}</p>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${languageColors[repo.language] || 'bg-gray-500'}`} />
                  <span>{repo.language}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  <span>{(repo.stars / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5" />
                  <span>{(repo.forks / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{repo.lastUpdated}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Imports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Imports</h2>
          <button
            onClick={() => fetchRepositories()}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="space-y-3">
          {repositories.length === 0 ? (
            <div className="p-8 rounded-xl glass border border-white/5 text-center text-gray-400">
              No repositories imported yet.
            </div>
          ) : (
            repositories.slice(0, 5).map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">{repo.name}</p>
                    <p className="text-xs text-gray-500">{repo.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {repo.status === 'importing' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                      <span className="text-sm text-yellow-400">Importing...</span>
                    </div>
                  ) : repo.status === 'error' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">Error</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Ready</span>
                    </div>
                  )}
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
