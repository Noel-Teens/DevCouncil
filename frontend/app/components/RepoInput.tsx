"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useAuth } from "./AuthProvider";

export default function RepoInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Require auth before submitting
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Please enter a GitHub repository URL");
      return;
    }

    if (
      !trimmedUrl.startsWith("https://github.com/") &&
      !trimmedUrl.startsWith("http://github.com/")
    ) {
      setError("Please enter a valid GitHub URL (e.g., https://github.com/owner/repo)");
      return;
    }

    setLoading(true);
    try {
      const response = await api.createAnalysis(trimmedUrl);
      router.push(`/analyze/${response.analysis_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start analysis";
      if (message.includes("Authentication required") || message.includes("401")) {
        router.push("/login");
        return;
      }
      setError(message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="command-bar">
        <svg className="w-[18px] h-[18px] flex-shrink-0 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.34.85 0 1.7.12 2.5.34 1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .26.18.58.69.48A10.01 10.01 0 0022 12c0-5.52-4.48-10-10-10z"/>
        </svg>
        <input
          type="text"
          inputMode="url"
          id="repo-url-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="github.com/owner/repository"
          disabled={loading}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="submit"
          id="analyze-button"
          className="btn-primary flex-shrink-0"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="hidden sm:inline">Analyzing…</span>
            </>
          ) : (
            <>
              <span>Analyze</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M5 12h13" />
              </svg>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-400 animate-fade-in" id="repo-input-error">
          {error}
        </div>
      )}
    </form>
  );
}
