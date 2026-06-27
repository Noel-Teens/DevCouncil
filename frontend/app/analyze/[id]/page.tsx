"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
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

  const handleAnalysisComplete = useCallback(() => {
    setIsComplete(true);
    // Fetch the final result
    api.getAnalysis(analysisId).then((data: AnalysisResult) => {
      setAnalysisData(data);
      if (data.consensus_report) {
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
      }
    }).catch(() => {
      // Analysis not yet available, SSE will handle it
    });
  }, [analysisId]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Header */}
      <header className="glass border-b border-[var(--border)] sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--gradient-primary)" }}
              >
                DC
              </div>
              <span className="font-bold text-sm text-[var(--text-primary)]">
                DevCouncil<span className="text-[var(--accent)]">AI</span>
              </span>
            </Link>
            <span className="text-[var(--text-muted)] text-xs">/</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {analysisId.slice(0, 8)}...
            </span>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-3">
            {isComplete ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Complete
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1 rounded-full border border-[var(--accent)]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Analyzing
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
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
            {report ? (
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
