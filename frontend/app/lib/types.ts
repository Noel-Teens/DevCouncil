/**
 * TypeScript types matching all backend schemas.
 * Agent events, findings, consensus reports, and API types.
 */

// ── Enums ──

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type AnalysisStatus =
  | "pending"
  | "ingesting"
  | "analyzing"
  | "discussing"
  | "consensus"
  | "complete"
  | "failed";

export type AgentStatusType = "pending" | "running" | "complete" | "partial" | "failed";

export type TurnType = "challenge" | "agree" | "concede" | "new_finding";

export type EventType =
  | "status_update"
  | "agent_start"
  | "agent_complete"
  | "agent_failed"
  | "finding"
  | "discussion_message"
  | "consensus_start"
  | "consensus_complete"
  | "analysis_complete"
  | "analysis_failed"
  | "error"
  | "keepalive"
  | "done";

// ── Agent Types ──

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  file_path: string;
  line_number: number | null;
  description: string;
  recommendation: string;
  confidence: number;
  source: string;
  verified: boolean;
  veto_active?: boolean;
}

export interface AgentSummary {
  agent_name: string;
  summary: string;
  top_priority: string;
  finding_count: number;
}

export interface AgentOutput {
  agent_name: string;
  status: AgentStatusType;
  findings: Finding[];
  summary: string;
  top_priority: string;
}

// ── Discussion ──

export interface DiscussionTurn {
  round_number: number;
  agent_name: string;
  turn_type: TurnType;
  target_agent: string | null;
  target_finding_id: string | null;
  message: string;
  confidence: number | null;
}

// ── Consensus ──

export interface ActionItem {
  priority: number;
  finding_ids: string[];
  title: string;
  effort: "< 1 hour" | "< 1 day" | "< 1 week" | "> 1 week";
  assignable_to: string;
}

export interface ConflictResolution {
  agent_a: string;
  agent_b: string;
  finding_ids: string[];
  winner: string;
  reason: string;
}

export interface ConsensusReport {
  executive_summary: string;
  findings: Finding[];
  action_plan: ActionItem[];
  conflicts_resolved: ConflictResolution[];
  agents_that_participated: string[];
  agents_that_failed: string[];
}

// ── SSE Events ──

export interface AgentEvent {
  event_type: EventType;
  agent_name: string | null;
  data: Record<string, unknown>;
  timestamp: string;
}

// ── API Types ──

export interface AnalysisRequest {
  repo_url: string;
}

export interface AnalysisResponse {
  analysis_id: string;
  status: AnalysisStatus;
  repo_url: string;
}

export interface AnalysisResult {
  status: AnalysisStatus;
  repo_url: string;
  repo_name: string;
  agent_outputs: AgentOutput[];
  discussion_turns: DiscussionTurn[];
  consensus_report: ConsensusReport;
  completed_at: string;
  error?: string;
}

// ── Agent Metadata ──

export const AGENT_INFO: Record<
  string,
  { name: string; title: string; color: string; icon: string; abbr: string; gradient: string }
> = {
  architect: {
    name: "architect",
    title: "Architect",
    color: "#5eb1ef",
    icon: "🏗️",
    abbr: "AR",
    gradient: "rgba(94, 177, 239, 0.13)",
  },
  security: {
    name: "security",
    title: "Security",
    color: "#ff6b6b",
    icon: "🛡️",
    abbr: "SE",
    gradient: "rgba(255, 107, 107, 0.13)",
  },
  code_reviewer: {
    name: "code_reviewer",
    title: "Code Reviewer",
    color: "#ffb454",
    icon: "🔍",
    abbr: "CR",
    gradient: "rgba(255, 180, 84, 0.13)",
  },
  consensus_director: {
    name: "consensus_director",
    title: "Consensus Director",
    color: "#c6f24e",
    icon: "⚖️",
    abbr: "CD",
    gradient: "rgba(198, 242, 78, 0.13)",
  },
};

export const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string; border: string; glow: string }
> = {
  CRITICAL: {
    label: "Critical",
    color: "#ff3b3b",
    bg: "rgba(255, 59, 59, 0.12)",
    border: "rgba(255, 59, 59, 0.3)",
    glow: "0 0 20px rgba(255, 59, 59, 0.3)",
  },
  HIGH: {
    label: "High",
    color: "#f97316",
    bg: "rgba(249, 115, 22, 0.12)",
    border: "rgba(249, 115, 22, 0.3)",
    glow: "0 0 20px rgba(249, 115, 22, 0.3)",
  },
  MEDIUM: {
    label: "Medium",
    color: "#eab308",
    bg: "rgba(234, 179, 8, 0.12)",
    border: "rgba(234, 179, 8, 0.3)",
    glow: "0 0 20px rgba(234, 179, 8, 0.3)",
  },
  LOW: {
    label: "Low",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.3)",
    glow: "0 0 20px rgba(59, 130, 246, 0.3)",
  },
  INFO: {
    label: "Info",
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.3)",
    glow: "0 0 20px rgba(139, 92, 246, 0.3)",
  },
};
