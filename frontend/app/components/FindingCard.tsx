import type { Finding } from "../lib/types";
import { AgentBadge, agentMeta } from "../lib/agents";
import SeverityBadge from "./SeverityBadge";

interface FindingCardProps {
  finding: Finding;
  index?: number;
}

export default function FindingCard({ finding, index = 0 }: FindingCardProps) {
  const meta = agentMeta(finding.source);

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
          <span className="mono text-[11px] text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded">
            {finding.category}
          </span>
        </div>
        {finding.veto_active && (
          <span className="mono text-[10px] font-semibold text-[#ff6a6a] bg-[rgba(255,76,76,0.1)] px-2 py-0.5 rounded border border-[rgba(255,76,76,0.28)] tracking-wider">
            VETO
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
      <div className="bg-[#0b0d11] rounded-lg p-3 border-l-2 border border-[var(--border)]" style={{ borderLeftColor: "var(--accent-line)" }}>
        <div className="eyebrow mb-1.5" style={{ color: "var(--accent)" }}>
          Recommended fix
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {finding.recommendation}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <AgentBadge agent={finding.source} size={18} radius={5} />
          <span className="mono">{meta.title}</span>
          {finding.verified && (
            <span
              className="mono px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider"
              style={{ color: "var(--accent)", background: "var(--accent-quiet)" }}
            >
              VERIFIED
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
