"use client";

import { useEffect, useState, useCallback, useMemo, use } from "react";
import Link from "next/link";
import { MessagesSquare, ScrollText, CircleCheck, CircleAlert, XCircle } from "lucide-react";
import Navbar from "../../components/Navbar";
import DiscussionRoom from "../../components/DiscussionRoom";
import ConsensusReportView from "../../components/ConsensusReport";
import { api } from "../../lib/api";
import type { AgentEvent, AnalysisResult, ConsensusReport } from "../../lib/types";

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

  // Rebuild the discussion transcript from stored data once complete, so
  // revisiting the Discussion Room shows the debate instead of a dead stream.
  const staticEvents = useMemo<AgentEvent[] | null>(() => {
    if (!isComplete || !analysisData || analysisData.status !== "complete") return null;
    const evs: AgentEvent[] = [];
    for (const output of analysisData.agent_outputs ?? []) {
      for (const finding of output.findings ?? []) {
        evs.push({
          event_type: "finding",
          agent_name: output.agent_name,
          data: finding as unknown as Record<string, unknown>,
          timestamp: "",
        });
      }
    }
    for (const turn of analysisData.discussion_turns ?? []) {
      evs.push({
        event_type: "discussion_message",
        agent_name: turn.agent_name,
        data: turn as unknown as Record<string, unknown>,
        timestamp: "",
      });
    }
    return evs;
  }, [isComplete, analysisData]);

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
  const badgeState = isComplete ? (error ? "failed" : "complete") : "analyzing";
  const badgeColor = badgeState === "failed" ? "#ff6b6b" : badgeState === "complete" ? "#c6f24e" : "#5eb1ef";
  const statusBadge = (
    <span
      className="flex items-center gap-1.5 mono text-[11px] font-semibold px-2.5 py-1 rounded-md"
      style={{ color: badgeColor, background: `${badgeColor}18`, border: `1px solid ${badgeColor}3d` }}
    >
      {badgeState === "failed" ? <CircleAlert size={12} /> : badgeState === "complete" ? <CircleCheck size={12} /> : (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: badgeColor }} />
      )}
      {badgeState === "failed" ? "Failed" : badgeState === "complete" ? "Complete" : "Analyzing"}
    </span>
  );

  const repoName = analysisData?.repo_name || "Analysis";

  const tabs = [
    { id: "discussion" as const, label: "Discussion Room", Icon: MessagesSquare, count: null as number | null },
    { id: "report" as const, label: "Consensus Report", Icon: ScrollText, count: report ? report.findings.length : null },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Navbar breadcrumb={repoName} rightContent={statusBadge} />

      {/* Sub-header + segmented tabs */}
      <div className="border-b border-[var(--border)] pt-14" style={{ background: "rgba(7,8,9,0.6)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-[1500px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow">Analysis</div>
            <div className="heading text-[15px] text-[var(--text-primary)] truncate">{repoName}</div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--border)] flex-shrink-0" style={{ background: "var(--surface)" }}>
            {tabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={active
                    ? { background: "var(--accent)", color: "var(--accent-ink)" }
                    : { color: "var(--text-muted)", background: "transparent" }}
                >
                  <t.Icon size={15} />
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.count != null && (
                    <span className="mono text-[10px] px-1.5 py-0.5 rounded font-semibold" style={active ? { background: "rgba(0,0,0,0.15)" } : { background: "var(--accent-quiet)", color: "var(--accent)" }}>{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1500px] mx-auto w-full px-6 py-6">
        {activeTab === "discussion" && (
          <div className="h-[calc(100vh-180px)]">
            <DiscussionRoom
              analysisId={analysisId}
              onComplete={handleAnalysisComplete}
              staticEvents={staticEvents}
            />
          </div>
        )}

        {activeTab === "report" && (
          <div>
            {error ? (
              /* Error state — analysis failed */
              <div className="glass-card p-16 text-center animate-fade-in-up">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,107,107,0.1)" }}>
                  <XCircle size={30} className="text-[#ff6b6b]" />
                </div>
                <h3 className="heading text-lg text-[var(--text-primary)] mb-2">
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
