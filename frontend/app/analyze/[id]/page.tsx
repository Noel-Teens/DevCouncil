"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import DiscussionRoom from "../../components/DiscussionRoom";
import ConsensusReportView from "../../components/ConsensusReport";
import { api } from "../../lib/api";
import type { AnalysisResult, ConsensusReport } from "../../lib/types";

interface AnalyzePageProps {
  params: Promise<{ id: string }>;
}

export default function AnalyzePage({ params }: AnalyzePageProps) {
  const { id: analysisId } = use(params);
  const [report, setReport] = useState<ConsensusReport | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"discussion" | "report">("discussion");
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisComplete = useCallback(() => {
    setIsComplete(true);
    // Fetch the final result
    api.getAnalysis(analysisId).then((data: AnalysisResult) => {
      setAnalysisData(data);
      if (data.status === "failed") {
        setError(data.error || "Analysis failed");
      } else if (data.consensus_report) {
        setReport(data.consensus_report);
        setActiveTab("report");
      }
    }).catch(console.error);
  }, [analysisId]);

  // Check if analysis is already complete on mount
  useEffect(() => {
    api.getAnalysis(analysisId).then((data: AnalysisResult) => {
      if (data.status === "complete" && data.consensus_report) {
        setAnalysisData(data);
        setReport(data.consensus_report);
        setIsComplete(true);
      } else if (data.status === "failed") {
        setError(data.error || "Analysis failed");
        setIsComplete(true);
      }
    }).catch(() => {
      // Analysis not yet available, SSE will handle it
    });
  }, [analysisId]);

  // Status badge for the navbar
  const statusBadge = (
    <div className="flex items-center gap-3">
      {isComplete ? (
        error ? (
          <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Failed
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Complete
          </span>
        )
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1 rounded-full border border-[var(--accent)]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Analyzing
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Navbar
        breadcrumb={analysisId.slice(0, 8) + "..."}
        rightContent={statusBadge}
      />

      {/* Tab bar */}
      <div className="border-b border-[var(--border)] bg-[var(--background)] pt-14">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex gap-1">
            <button
              id="tab-discussion"
              onClick={() => setActiveTab("discussion")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "discussion"
                  ? "text-[var(--accent)] border-[var(--accent)]"
                  : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]"
              }`}
            >
              💬 Discussion Room
            </button>
            <button
              id="tab-report"
              onClick={() => setActiveTab("report")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "report"
                  ? "text-[var(--accent)] border-[var(--accent)]"
                  : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]"
              }`}
            >
              📊 Consensus Report
              {report && (
                <span className="bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {report.findings.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-6">
        {activeTab === "discussion" && (
          <div className="h-[calc(100vh-180px)]">
            <DiscussionRoom
              analysisId={analysisId}
              onComplete={handleAnalysisComplete}
            />
          </div>
        )}

        {activeTab === "report" && (
          <div>
            {error ? (
              /* Error state — analysis failed */
              <div className="glass-card p-16 text-center animate-fade-in-up">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center text-3xl bg-red-500/10">
                  ❌
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Analysis Failed
                </h3>
                <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6">
                  {error}
                </p>
                <Link
                  href="/"
                  className="btn-primary inline-flex items-center gap-2 text-sm px-6 py-2.5"
                >
                  Try Another Repository
                </Link>
              </div>
            ) : report ? (
              <ConsensusReportView report={report} />
            ) : (
              <div className="glass-card p-16 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center text-3xl bg-[var(--surface)]">
                  ⏳
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Report in Progress
                </h3>
                <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                  The agents are still analyzing your repository. Switch to the Discussion Room
                  to watch the live debate. The report will appear here once consensus is reached.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
