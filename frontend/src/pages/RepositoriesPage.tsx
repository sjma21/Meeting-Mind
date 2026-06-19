import { useState, useEffect, useRef } from "react";
import {
  GitBranch, Plus, Trash2, RefreshCw, Search, Loader2,
  CheckCircle, AlertCircle, XCircle,
} from "lucide-react";
import * as api from "../lib/api";
import type { Repo } from "../types";
import type { SearchResult } from "../lib/api";

type StatusBadgeProps = { repo: Repo; isIndexing: boolean };

function StatusBadge({ repo, isIndexing }: StatusBadgeProps) {
  if (isIndexing) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
        <Loader2 className="w-3 h-3 animate-spin" /> Indexing…
      </span>
    );
  }
  if (repo.indexed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
        <CheckCircle className="w-3 h-3" /> Indexed · {repo.fileCount} files
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      <AlertCircle className="w-3 h-3" /> Not indexed
    </span>
  );
}

interface SearchPanelProps {
  repoId: string;
}

function SearchPanel({ repoId }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await api.searchRepo(repoId, query);
      setResults(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-500 mb-2">Test semantic search</p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. authentication middleware"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Search
        </button>
      </form>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {results.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {results.map((r) => (
            <div
              key={r.filePath}
              className="flex items-start justify-between px-3 py-2 bg-gray-50 rounded-lg"
            >
              <div className="min-w-0">
                <p className="text-xs font-mono text-indigo-700 truncate">{r.filePath}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.contentSummary}</p>
              </div>
              <span className="ml-3 text-xs font-medium text-gray-400 flex-shrink-0">
                {(r.similarity * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !searching && query && (
        <p className="text-xs text-gray-400 mt-2">No results found. Try a different query.</p>
      )}
    </div>
  );
}

interface RepoCardProps {
  repo: Repo;
  onDelete: (id: string) => void;
  onIndexed: (updated: Repo) => void;
}

function RepoCard({ repo, onDelete, onIndexed }: RepoCardProps) {
  const [isIndexing, setIsIndexing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleIndex() {
    setIsIndexing(true);
    setError(null);
    try {
      await api.indexRepo(repo.id);
      // Poll every 3 seconds
      pollRef.current = setInterval(async () => {
        const repos = await api.getRepos();
        const updated = repos.find((r) => r.id === repo.id);
        if (updated?.indexed) {
          clearInterval(pollRef.current!);
          setIsIndexing(false);
          onIndexed(updated);
        }
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start indexing");
      setIsIndexing(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      await api.deleteRepo(repo.id);
      onDelete(repo.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-900 truncate">
              {repo.owner}/{repo.name}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{repo.url}</p>
        </div>

        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <StatusBadge repo={repo} isIndexing={isIndexing} />

          {!isIndexing && (
            <button
              onClick={handleIndex}
              title={repo.indexed ? "Re-index" : "Index"}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleDelete}
            title={deleteConfirm ? "Click again to confirm" : "Delete"}
            className={`p-1.5 rounded-lg transition-colors ${
              deleteConfirm
                ? "text-red-500 bg-red-50 hover:bg-red-100"
                : "text-gray-400 hover:text-red-500 hover:bg-red-50"
            }`}
          >
            {deleteConfirm ? <XCircle className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {repo.indexed && <SearchPanel repoId={repo.id} />}
    </div>
  );
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectUrl, setConnectUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    api.getRepos()
      .then(setRepos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!connectUrl.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const repo = await api.connectRepo(connectUrl.trim());
      setRepos((prev) => [repo, ...prev]);
      setConnectUrl("");
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : "Failed to connect repo");
    } finally {
      setConnecting(false);
    }
  }

  function handleDelete(id: string) {
    setRepos((prev) => prev.filter((r) => r.id !== id));
  }

  function handleIndexed(updated: Repo) {
    setRepos((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  return (
    <div className="space-y-6">
      {/* Connect form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Connect Repository</h2>
        <form onSubmit={handleConnect} className="flex gap-3">
          <input
            type="text"
            value={connectUrl}
            onChange={(e) => setConnectUrl(e.target.value)}
            placeholder="https://github.com/username/repo-name"
            className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={connecting || !connectUrl.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Connect
          </button>
        </form>
        {connectError && (
          <p className="text-sm text-red-600 mt-2">{connectError}</p>
        )}
        {connectError?.includes("GitHub token") && (
          <p className="text-xs text-gray-500 mt-1">
            Go to <a href="/settings" className="text-indigo-600 hover:underline">Settings</a> to add your GitHub Personal Access Token first.
          </p>
        )}
      </div>

      {/* Repo list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Connected Repositories
        </h2>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && repos.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4">
              <GitBranch className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No repositories connected yet</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">
              Paste a GitHub repo URL above to get started.
            </p>
          </div>
        )}

        {!loading && repos.length > 0 && (
          <div className="space-y-4">
            {repos.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                onDelete={handleDelete}
                onIndexed={handleIndexed}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
