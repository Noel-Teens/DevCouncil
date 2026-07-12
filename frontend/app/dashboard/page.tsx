"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import RepoInput from "../components/RepoInput";
import RepoSelector from "../components/RepoSelector";
import SpotlightCard from "../components/SpotlightCard";
import Counter from "../components/Counter";
import OrbField from "../components/OrbField";
import { StaggerGroup, StaggerItem } from "../components/Stagger";
import { useAuth } from "../components/AuthProvider";
import { AGENT_ORDER, AgentBadge, agentMeta } from "../lib/agents";
import { api } from "../lib/api";
import {
  FolderGit2, ArrowRight, AlertTriangle, Loader2, Sparkles, History, GitBranch,
  Layers, ListChecks, CircleCheck, Boxes,
} from "lucide-react";

interface ReportSummary {
  analysis_id: string;
  status: string;
  repo_url: string;
  repo_name: string;
  completed_at: string | null;
  finding_count: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  complete: { label: "Complete", color: "#c6f24e" },
  failed: { label: "Failed", color: "#ff6b6b" },
  pending: { label: "Pending", color: "#eab308" },
  ingesting: { label: "Ingesting", color: "#5eb1ef" },
  analyzing: { label: "Analyzing", color: "#5eb1ef" },
  discussing: { label: "Discussing", color: "#ffb454" },
  consensus: { label: "Consensus", color: "#c6f24e" },
};

const EXAMPLES = [
  { label: "pallets/flask", url: "https://github.com/pallets/flask" },
  { label: "psf/requests", url: "https://github.com/psf/requests" },
  { label: "tiangolo/fastapi", url: "https://github.com/fastapi/fastapi" },
];

const SEV_META = [
  { key: "CRITICAL", label: "Critical", color: "#ff6b6b" },
  { key: "HIGH", label: "High", color: "#fb9a4b" },
  { key: "MEDIUM", label: "Medium", color: "#e6c14a" },
  { key: "LOW", label: "Low", color: "#7cc0f0" },
  { key: "INFO", label: "Info", color: "#94a3b8" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [sevTotals, setSevTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exampleBusy, setExampleBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const load = () => {
    setLoading(true);
    setError(null);
    api.listReports()
      .then((data) => {
        setReports((data.reports as unknown as ReportSummary[]) || []);
        setSevTotals(((data as unknown as { severity_totals?: Record<string, number> }).severity_totals) || {});
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated]);

  const startExample = async (url: string) => {
    setExampleBusy(url);
    try {
      const res = await api.createAnalysis(url);
      router.push(`/analyze/${res.analysis_id}`);
    } catch {
      setExampleBusy(null);
    }
  };

  const stats = useMemo(() => {
    const findings = reports.reduce((a, r) => a + (r.finding_count || 0), 0);
    const repos = new Set(reports.map((r) => r.repo_name || r.repo_url)).size;
    const complete = reports.filter((r) => r.status === "complete").length;
    return [
      { label: "reviews", value: reports.length, Icon: Layers, color: "#5eb1ef" },
      { label: "findings surfaced", value: findings, Icon: ListChecks, color: "#ffb454" },
      { label: "repos analyzed", value: repos, Icon: Boxes, color: "#c6f24e" },
      { label: "completed", value: complete, Icon: CircleCheck, color: "#58e6b8" },
    ];
  }, [reports]);

  const formatDate = (dateStr: string | null) =>
    !dateStr ? "—" : new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const extractRepoName = (url: string) => {
    const parts = url.replace(/^https?:\/\/github\.com\//, "").split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : url;
  };

  if (authLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[var(--text-muted)]" size={22} /></div>;
  }

  const isGuest = !user || user.github_id === "guest";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-6 relative">
        <div className="absolute inset-x-0 top-0 h-[420px] overflow-hidden pointer-events-none"><OrbField /></div>

        <div className="z-content max-w-6xl mx-auto">
          {/* Heading */}
          <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <div className="eyebrow mb-2">Console</div>
            <h1 className="display-lg text-[var(--text-primary)]">
              Start a review, <span className="text-gradient">{user?.username === "guest" ? "guest" : `@${user?.username}`}</span>.
            </h1>
          </motion.div>

          {/* ── PRIMARY ACTION: new analysis (2/3) + council (1/3) ── */}
          <div className="grid lg:grid-cols-3 gap-3 mb-12">
            <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <SpotlightCard className="glass-card conic-border p-6 sm:p-7 h-full relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, var(--accent-quiet), transparent 70%)" }} />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1"><Sparkles size={16} style={{ color: "var(--accent)" }} /><span className="heading text-[15px] text-[var(--text-primary)]">New analysis</span></div>
                  <p className="text-[13px] text-[var(--text-muted)] mb-5">Paste any public GitHub URL — the council convenes in ~45 seconds.</p>
                  <RepoInput />
                  {isGuest ? (
                    <p className="mt-4 text-[13px] text-[var(--text-muted)] flex items-center gap-2"><GitBranch size={14} /> Sign in with GitHub to pick straight from your repositories.</p>
                  ) : (
                    <div className="mt-6">
                      <div className="flex items-center gap-3 mb-4"><span className="mono text-[10px] uppercase tracking-widest text-[var(--text-faint)] whitespace-nowrap">or pick a repo</span><span className="h-px flex-1 bg-[var(--border)]" /></div>
                      <RepoSelector />
                    </div>
                  )}

                  {/* Quick-start examples */}
                  <div className="mt-6 pt-5 border-t border-[var(--border)]">
                    <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-faint)] mb-3">Try an example</div>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLES.map((e) => (
                        <motion.button
                          key={e.url}
                          onClick={() => startExample(e.url)}
                          disabled={exampleBusy !== null}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 400, damping: 22 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] mono text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-line)] transition-colors disabled:opacity-40"
                          style={{ background: "rgba(255,255,255,0.02)" }}
                        >
                          {exampleBusy === e.url ? <Loader2 size={13} className="animate-spin" /> : <FolderGit2 size={13} className="text-[var(--text-muted)]" />}
                          {e.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Your council tile */}
            <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}>
              <SpotlightCard className="glass-card p-5 h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="heading text-[13px] text-[var(--text-primary)]">Your council</span>
                  <span className="flex items-center gap-1.5 mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-glow" /> ready</span>
                </div>
                <div className="space-y-2">
                  {AGENT_ORDER.map((a, i) => {
                    const m = agentMeta(a);
                    return (
                      <motion.div key={a} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.015)" }} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}>
                        <AgentBadge agent={a} size={30} radius={8} />
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium text-[var(--text-primary)] leading-tight">{m.title}</div>
                          <div className="mono text-[9px] text-[var(--text-muted)] truncate">{m.role}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </SpotlightCard>
            </motion.div>
          </div>

          {/* ── OVERVIEW: stats + findings breakdown ── */}
          {reports.length > 0 && (
            <div className="flex items-center gap-4 mb-5">
              <span className="eyebrow whitespace-nowrap">Overview</span>
              <div className="rule-accent flex-1" />
            </div>
          )}

          {reports.length > 0 && (
            <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {stats.map((s) => (
                <StaggerItem key={s.label}>
                  <SpotlightCard className="glass-card p-4 h-full relative overflow-hidden">
                    <span className="absolute left-0 top-0 h-[2px] w-full opacity-70" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                    <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center mb-3 border" style={{ background: `${s.color}14`, color: s.color, borderColor: `${s.color}33` }}><s.Icon size={15} /></span>
                    <div className="display-lg text-[var(--text-primary)]" style={{ fontSize: "1.8rem" }}><Counter value={s.value} /></div>
                    <div className="mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">{s.label}</div>
                  </SpotlightCard>
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}

          {/* Findings breakdown */}
          {(() => {
            const sevTotal = SEV_META.reduce((a, s) => a + (sevTotals[s.key] || 0), 0);
            if (sevTotal === 0) return null;
            return (
              <motion.div className="mb-10" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <SpotlightCard className="glass-card p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <span className="heading text-[14px] text-[var(--text-primary)]">Findings breakdown</span>
                    <span className="flex items-center gap-3">
                      <span className="mono text-[11px] text-[var(--text-muted)]"><span className="text-[var(--text-primary)] font-semibold">{sevTotal}</span> total</span>
                      {(sevTotals.VERIFIED || 0) > 0 && (
                        <span className="mono text-[10px] font-semibold px-2 py-0.5 rounded" style={{ color: "var(--accent)", background: "var(--accent-quiet)" }}>{sevTotals.VERIFIED} verified</span>
                      )}
                    </span>
                  </div>
                  {/* stacked bar */}
                  <div className="flex h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                    {SEV_META.map((s) => {
                      const c = sevTotals[s.key] || 0;
                      if (!c) return null;
                      return (
                        <motion.div
                          key={s.key}
                          title={`${s.label}: ${c}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(c / sevTotal) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                          style={{ background: s.color, minWidth: 3 }}
                        />
                      );
                    })}
                  </div>
                  {/* legend */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                    {SEV_META.map((s) => (
                      <div key={s.key} className="flex items-center gap-2 text-[12px]">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                        <span className="text-[var(--text-secondary)]">{s.label}</span>
                        <span className="mono text-[var(--text-primary)] font-semibold">{sevTotals[s.key] || 0}</span>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })()}

          {/* History */}
          <div className="flex items-center gap-2 mb-4">
            <History size={15} className="text-[var(--text-muted)]" />
            <span className="heading text-[14px] text-[var(--text-primary)]">Recent analyses</span>
            {reports.length > 0 && <span className="mono text-[11px] text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">{reports.length}</span>}
          </div>

          {loading && <div className="glass-card p-10 text-center"><Loader2 className="animate-spin mx-auto mb-3 text-[var(--text-muted)]" size={20} /><p className="text-sm text-[var(--text-muted)]">Loading…</p></div>}
          {error && !loading && <div className="glass-card p-7 text-center"><AlertTriangle className="mx-auto mb-3 text-[#ff6b6b]" size={22} /><p className="text-sm text-[var(--text-muted)] mb-4">{error}</p><button onClick={load} className="btn-ghost text-sm mx-auto">Retry</button></div>}
          {!loading && !error && reports.length === 0 && (
            <div className="glass-card p-14 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center border border-[var(--border)]" style={{ background: "var(--surface-2)" }}><FolderGit2 size={22} className="text-[var(--text-muted)]" /></div>
              <h3 className="heading text-base text-[var(--text-primary)] mb-2">No analyses yet</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">Paste a repo above to run your first multi-agent review — about 45 seconds.</p>
            </div>
          )}

          {!loading && !error && reports.length > 0 && (
            <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reports.map((report) => {
                const status = statusConfig[report.status] || statusConfig.pending;
                const repoName = report.repo_name || extractRepoName(report.repo_url);
                return (
                  <StaggerItem key={report.analysis_id}>
                    <Link href={`/analyze/${report.analysis_id}`} className="block group h-full">
                      <SpotlightCard className="glass-card p-4 h-full relative overflow-hidden">
                        <span className="absolute left-0 top-0 h-full w-[2px]" style={{ background: status.color, opacity: 0.5 }} />
                        <div className="flex items-start gap-3 mb-3">
                          <span className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border)] flex-shrink-0" style={{ background: "var(--surface-2)" }}><FolderGit2 size={16} className="text-[var(--text-secondary)]" /></span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">{repoName}</div>
                            <div className="mono text-[11px] text-[var(--text-muted)] mt-0.5">{formatDate(report.completed_at)}</div>
                          </div>
                          <span className="mono text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0" style={{ color: status.color, background: `${status.color}18`, border: `1px solid ${status.color}3d` }}>{status.label}</span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                          <span className="mono text-[11px] text-[var(--text-muted)]"><span className="text-[var(--text-primary)] font-semibold">{report.finding_count}</span> findings</span>
                          <span className="flex items-center gap-1 mono text-[11px] text-[var(--text-faint)] group-hover:text-[var(--accent)] transition-colors">view report <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" /></span>
                        </div>
                      </SpotlightCard>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerGroup>
          )}
        </div>
      </main>
    </div>
  );
}
