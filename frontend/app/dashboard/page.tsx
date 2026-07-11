"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";

interface ReportSummary {
  analysis_id: string;
  status: string;
  repo_url: string;
  repo_name: string;
  completed_at: string | null;
  finding_count: number;
}

export default function DashboardPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listReports()
      .then((data) => {
        setReports((data.reports as unknown as ReportSummary[]) || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const extractRepoName = (url: string) => {
    const parts = url.replace("https://github.com/", "").replace("http://github.com/", "").split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : url;
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    complete: { label: "Complete", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", border: "rgba(34, 197, 94, 0.2)" },
    failed: { label: "Failed", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)" },
    pending: { label: "Pending", color: "#eab308", bg: "rgba(234, 179, 8, 0.1)", border: "rgba(234, 179, 8, 0.2)" },
    ingesting: { label: "Ingesting", color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)", border: "rgba(99, 102, 241, 0.2)" },
    analyzing: { label: "Analyzing", color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)", border: "rgba(99, 102, 241, 0.2)" },
    discussing: { label: "Discussing", color: "#a855f7", bg: "rgba(168, 85, 247, 0.1)", border: "rgba(168, 85, 247, 0.2)" },
    consensus: { label: "Consensus", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.2)" },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Navbar />

      <main className="flex-1 pt-20 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                Dashboard
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                Your repository analysis history
              </p>
            </div>
            <Link href="/" className="btn-primary text-sm px-5 py-2.5">
              + New Analysis
            </Link>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="glass-card p-12 text-center">
              <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              <p className="text-sm text-[var(--text-muted)]">Loading analyses...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="glass-card p-8 text-center border-red-500/20">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl bg-red-500/10">
                ⚠️
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                Failed to Load
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  api
                    .listReports()
                    .then((data) => setReports((data.reports as unknown as ReportSummary[]) || []))
                    .catch((err) => setError(err instanceof Error ? err.message : "Failed"))
                    .finally(() => setLoading(false));
                }}
                className="btn-primary text-sm px-5 py-2"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && reports.length === 0 && (
            <div className="glass-card p-16 text-center animate-fade-in-up">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-4xl bg-[var(--surface)]">
                🔬
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                No analyses yet
              </h3>
              <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6 leading-relaxed">
                Paste a public GitHub repository URL to run your first
                multi-agent code review. It takes about 45 seconds.
              </p>
              <Link href="/" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Start Your First Analysis
              </Link>
            </div>
          )}

          {/* Reports list */}
          {!loading && !error && reports.length > 0 && (
            <div className="space-y-3 animate-fade-in-up">
              {reports.map((report) => {
                const status = statusConfig[report.status] || statusConfig.pending;
                const repoName = report.repo_name || extractRepoName(report.repo_url);

                return (
                  <Link
                    key={report.analysis_id}
                    href={`/analyze/${report.analysis_id}`}
                    className="glass-card flex items-center gap-5 p-5 group cursor-pointer"
                  >
                    {/* Repo icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      📦
                    </div>

                    {/* Repo info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                        {repoName}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {formatDate(report.completed_at)}
                      </div>
                    </div>

                    {/* Findings count */}
                    {report.finding_count > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--surface)] px-2.5 py-1 rounded-full">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {report.finding_count}
                        </span>
                        findings
                      </div>
                    )}

                    {/* Status badge */}
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{
                        color: status.color,
                        background: status.bg,
                        border: `1px solid ${status.border}`,
                      }}
                    >
                      {status.label}
                    </span>

                    {/* Arrow */}
                    <svg
                      className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
