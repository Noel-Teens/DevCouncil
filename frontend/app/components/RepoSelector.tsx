"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchRepos() {
      try {
        const data = await api.getUserRepos();
        setRepos(data);
      } catch (err) {
        console.error("Failed to fetch repos", err);
        setError("Failed to load your repositories.");
      } finally {
        setLoading(false);
      }
    }
    fetchRepos();
  }, []);

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
      <div className="w-full max-w-4xl mx-auto mt-8 flex justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return null; // Fail silently or show error in UI
  }

  if (repos.length === 0) {
    return null; // Guest user or no repos
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 animate-fade-in-up">
      <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">
        Select a Repository to Analyze
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {repos.map((repo) => (
          <button
            key={repo.id}
            onClick={() => handleSelectRepo(repo.html_url)}
            className="text-left glass-card p-5 transition-all hover:border-[var(--accent)] hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
          >
            {/* Background glow on hover */}
            <div className="absolute inset-0 bg-[var(--accent)] opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
            
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-base font-bold text-[var(--text-primary)] truncate pr-4">
                {repo.name}
              </h4>
              {repo.language && (
                <span className="text-xs px-2 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] whitespace-nowrap">
                  {repo.language}
                </span>
              )}
            </div>
            
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 min-h-[40px]">
              {repo.description || "No description provided."}
            </p>
            
            <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{repo.full_name}</span>
              <span className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                Analyze
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
