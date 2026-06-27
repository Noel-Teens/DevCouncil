import type { Finding } from "../lib/types";
import { AGENT_INFO } from "../lib/types";
import SeverityBadge from "./SeverityBadge";

interface FindingCardProps {
  finding: Finding;
  index?: number;
}

export default function FindingCard({ finding, index = 0 }: FindingCardProps) {
  const agentInfo = AGENT_INFO[finding.source] || {
    icon: "📋",
    color: "#8b5cf6",
    title: finding.source,
  };

  return (
    <div
      className="glass-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
      id={`finding-${finding.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <SeverityBadge severity={finding.severity} />
          <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] px-2 py-0.5 rounded-full">
            {finding.category}
          </span>
        </div>
        {finding.veto_active && (
          <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
            🔒 VETO
          </span>
        )}
      </div>

      {/* File path */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-3 font-mono">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span>{finding.file_path}</span>
        {finding.line_number && (
          <span className="text-[var(--accent)]">:L{finding.line_number}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
        {finding.description}
      </p>

      {/* Recommendation */}
      <div className="bg-[var(--surface)] rounded-lg p-3 border border-[var(--border)]">
        <div className="text-xs font-semibold text-emerald-400 mb-1.5 uppercase tracking-wide">
          💡 Recommendation
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {finding.recommendation}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>{agentInfo.icon}</span>
          <span>{agentInfo.title || finding.source}</span>
          {finding.verified && (
            <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[10px] font-bold">
              ✓ VERIFIED
            </span>
          )}
        </div>

        {/* Confidence bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">{finding.confidence}%</span>
          <div className="confidence-bar w-16">
            <div
              className="confidence-bar-fill"
              style={{
                width: `${finding.confidence}%`,
                background:
                  finding.confidence >= 90
                    ? "#22c55e"
                    : finding.confidence >= 70
                    ? "#eab308"
                    : "#f97316",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
