"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "./AuthProvider";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  updated_at: string;
}

export default function RepoSelector() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  // Only real GitHub accounts have repos to list — guests/logged-out users don't,
  // so skip the fetch entirely (avoids a spinner flash and a needless 401).
  const canListRepos = isAuthenticated && !!user && user.github_id !== "guest";

  useEffect(() => {
    if (authLoading || !canListRepos) return;
    let cancelled = false;
    async function fetchRepos() {
      setLoading(true);
      try {
        const data = await api.getUserRepos();
        if (!cancelled) setRepos(data);
      } catch (err) {
        console.error("Failed to fetch repos", err);
        if (!cancelled) setError("Failed to load your repositories.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRepos();
    return () => {
      cancelled = true;
    };
  }, [authLoading, canListRepos]);

  if (!canListRepos) return null;

  const handleSelectRepo = async (repoUrl: string) => {
    try {
      const response = await api.createAnalysis(repoUrl);
      router.push(`/analyze/${response.analysis_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start analysis";
      if (message.includes("Authentication required") || message.includes("401")) {
        router.push("/login");
        return;
      }
      setError(message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) return null;
  if (repos.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {repos.map((repo) => (
        <button
          key={repo.id}
          onClick={() => handleSelectRepo(repo.html_url)}
          className="text-left glass-card card-interactive group p-4"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="flex items-center gap-2 min-w-0">
              <FolderGit2 size={15} className="text-[var(--text-muted)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                {repo.name}
              </span>
            </span>
            {repo.language && (
              <span className="mono text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
                {repo.language}
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-[var(--text-muted)] line-clamp-2 min-h-[34px] leading-relaxed">
            {repo.description || "No description provided."}
          </p>
          <div className="mt-2 flex items-center justify-between mono text-[10px] text-[var(--text-faint)]">
            <span className="truncate">{repo.full_name}</span>
            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: "var(--accent)" }}>
              Analyze <ArrowRight size={11} />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
