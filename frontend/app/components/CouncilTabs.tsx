"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentBadge, agentMeta } from "../lib/agents";
import { ArrowRight } from "lucide-react";

type Sample = {
  sev: string;
  sevClass: string;
  category: string;
  file: string;
  line: string;
  desc: string;
};

const COUNCIL: {
  name: string;
  tagline: string;
  points: string[];
  sample: Sample;
}[] = [
  {
    name: "architect",
    tagline: "System-design authority",
    points: ["Coupling, god classes & circular deps", "Scalability break-points, not vibes", "API surface & configuration design"],
    sample: { sev: "Medium", sevClass: "severity-medium", category: "Architecture", file: "src/services/users.py", line: ":240", desc: "Adopt a modular monolith — extract the shared _resolve_account() helper instead of splitting into services." },
  },
  {
    name: "security",
    tagline: "Vulnerability authority · has veto",
    points: ["Grounded in real Bandit scanner output", "OWASP Top 10, secrets, injection, auth", "Veto power on verified CRITICALs"],
    sample: { sev: "Critical", sevClass: "severity-critical", category: "Hardcoded Secret", file: "config/settings.py", line: ":23", desc: "Hardcoded AWS secret key (Bandit B105), present in git history — immediately exploitable. Rotate now." },
  },
  {
    name: "code_reviewer",
    tagline: "Code-quality authority",
    points: ["Silent failures rated HIGH by design", "Error handling, dead code, N+1s", "Exact file + line for every call"],
    sample: { sev: "High", sevClass: "severity-high", category: "Error Handling", file: "app/services/billing.py", line: ":88", desc: "charge_customer() swallows Stripe errors with a bare except — failed charges report success to the caller." },
  },
  {
    name: "consensus_director",
    tagline: "The final verdict",
    points: ["Arbitrates conflicts by explicit rules", "Deduplicates by root cause", "Ships one prioritized action plan"],
    sample: { sev: "Verdict", sevClass: "turn-agree", category: "Resolution", file: "modular monolith", line: "", desc: "Security overrides Architect on attack-surface grounds. Microservices withdrawn; extract-helper adopted." },
  },
];

export default function CouncilTabs() {
  const [active, setActive] = useState("architect");
  const item = COUNCIL.find((c) => c.name === active)!;
  const meta = agentMeta(active);

  return (
    <div className="grid md:grid-cols-[290px_1fr] gap-3">
      {/* Tab rail */}
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
        {COUNCIL.map((c) => {
          const m = agentMeta(c.name);
          const on = c.name === active;
          return (
            <button
              key={c.name}
              onClick={() => setActive(c.name)}
              className="relative glass-card p-3 flex items-center gap-3 text-left flex-shrink-0 md:flex-shrink transition-colors"
              style={on ? { borderColor: `${m.color}55`, background: `${m.color}0e` } : {}}
            >
              {on && (
                <motion.span
                  layoutId="council-bar"
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                  style={{ background: m.color }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <AgentBadge agent={c.name} size={38} radius={11} />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: on ? m.color : "var(--text-primary)" }}>{m.title}</div>
                <div className="mono text-[10px] text-[var(--text-muted)] truncate">{c.tagline}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      <div className="glass-card p-6 sm:p-7 relative overflow-hidden min-h-[320px]">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${meta.color}14, transparent 70%)` }} />
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            <div className="flex items-center gap-3 mb-5">
              <AgentBadge agent={active} size={46} radius={13} />
              <div>
                <h3 className="heading text-lg text-[var(--text-primary)]">{meta.title}</h3>
                <div className="mono text-[11px] text-[var(--text-muted)]">{item.tagline}</div>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              {item.points.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-[13.5px] text-[var(--text-secondary)]">
                  <ArrowRight size={13} style={{ color: meta.color }} className="flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>

            <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-faint)] mb-2">Sample finding</div>
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: "rgba(255,255,255,0.015)", borderLeft: `2px solid ${meta.color}66` }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`severity-badge ${item.sample.sevClass}`}>{item.sample.sev}</span>
                <span className="mono text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded">{item.sample.category}</span>
              </div>
              <div className="mono text-[11px] text-[var(--text-muted)] mb-2">{item.sample.file}<span style={{ color: "var(--accent)" }}>{item.sample.line}</span></div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{item.sample.desc}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
