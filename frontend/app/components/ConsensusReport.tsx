import type { ConsensusReport, Severity } from "../lib/types";
import FindingCard from "./FindingCard";
import ConflictResolutionCard from "./ConflictResolution";

interface ConsensusReportViewProps {
  report: ConsensusReport;
}

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

export default function ConsensusReportView({ report }: ConsensusReportViewProps) {
  // Group findings by severity
  const findingsBySeverity: Record<Severity, typeof report.findings> = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: [],
    INFO: [],
  };

  for (const finding of report.findings) {
    if (findingsBySeverity[finding.severity]) {
      findingsBySeverity[finding.severity].push(finding);
    }
  }

  return (
    <div className="space-y-8" id="consensus-report">
      {/* Executive Summary */}
      <div className="glass-card p-6 animate-fade-in-up">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <span className="text-xl">📊</span>
          Executive Summary
        </h2>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          {report.executive_summary}
        </p>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)]">Findings:</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {report.findings.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)]">Agents:</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {report.agents_that_participated.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)]">Conflicts Resolved:</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {report.conflicts_resolved.length}
            </span>
          </div>
          {report.agents_that_failed.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-red-400">Failed:</span>
              <span className="font-semibold text-red-400">
                {report.agents_that_failed.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Findings by severity */}
      {SEVERITY_ORDER.map((severity) => {
        const findings = findingsBySeverity[severity];
        if (findings.length === 0) return null;

        return (
          <div key={severity}>
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    severity === "CRITICAL"
                      ? "#ff3b3b"
                      : severity === "HIGH"
                      ? "#f97316"
                      : severity === "MEDIUM"
                      ? "#eab308"
                      : severity === "LOW"
                      ? "#3b82f6"
                      : "#8b5cf6",
                  boxShadow:
                    severity === "CRITICAL"
                      ? "0 0 8px rgba(255, 59, 59, 0.5)"
                      : "none",
                }}
              />
              {severity} ({findings.length})
            </h3>
            <div className="space-y-3">
              {findings.map((finding, idx) => (
                <FindingCard key={finding.id} finding={finding} index={idx} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Action Plan */}
      {report.action_plan.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="text-base">🎯</span>
            Action Plan
          </h3>
          <div className="glass-card overflow-hidden">
            {report.action_plan.map((action, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: "var(--gradient-primary)",
                    color: "white",
                  }}
                >
                  {action.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {action.title}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                    <span className="bg-[var(--surface)] px-2 py-0.5 rounded">
                      ⏱ {action.effort}
                    </span>
                    <span className="bg-[var(--surface)] px-2 py-0.5 rounded">
                      👤 {action.assignable_to}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflict Resolutions */}
      {report.conflicts_resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="text-base">⚔️</span>
            Conflict Resolutions
          </h3>
          <div className="space-y-3">
            {report.conflicts_resolved.map((conflict, idx) => (
              <ConflictResolutionCard key={idx} conflict={conflict} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
