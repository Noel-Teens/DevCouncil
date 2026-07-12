import Navbar from "./components/Navbar";
import Reveal from "./components/Reveal";
import HeroDebate from "./components/HeroDebate";
import StartCTA from "./components/StartCTA";
import SpotlightCard from "./components/SpotlightCard";
import CouncilTabs from "./components/CouncilTabs";
import Faq from "./components/Faq";
import { AgentBadge } from "./lib/agents";
import {
  Check, X, GitBranch, ShieldCheck, Gauge, Layers, ScrollText,
  MessagesSquare, Boxes, ArrowUpRight, HelpCircle,
} from "lucide-react";

const STATS = [
  { k: "< 45s", v: "full analysis", Icon: Gauge },
  { k: "Bandit", v: "grounded findings", Icon: ShieldCheck },
  { k: "3 + 1", v: "specialists + director", Icon: Boxes },
  { k: "$0.05", v: "per run", Icon: Layers },
];

const STEPS = [
  { step: "01", title: "Connect a repo", description: "Sign in with GitHub, pick a repo or paste any public URL. Ingestion + static analysis in seconds.", Icon: GitBranch },
  { step: "02", title: "Watch them debate", description: "Three specialists analyze independently, then challenge each other live over a streaming room.", Icon: MessagesSquare },
  { step: "03", title: "Get the verdict", description: "One deduped, severity-ranked report — every conflict resolved and explained in plain language.", Icon: ScrollText },
];

const MARQUEE = [
  "OWASP Top 10", "hardcoded secrets", "SQL injection", "N+1 queries", "God classes",
  "silent failures", "missing validation", "coupling", "dead code", "attack surface",
  "veto power", "consensus", "file:line citations", "no hallucinations",
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="hero-bg">
          <div className="aurora" />
          <div className="absolute inset-0 grid-pattern" />

          <div className="z-content max-w-7xl mx-auto px-6 pt-36 pb-16 grid lg:grid-cols-[1.02fr_0.98fr] gap-12 lg:gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 mb-7 animate-fade-in-up rounded-full border border-[var(--border)] pl-2 pr-3 py-1" style={{ background: "rgba(255,255,255,0.02)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-glow" />
                <span className="eyebrow">Multi-agent code review</span>
              </div>

              <h1 className="display-xl text-[var(--text-primary)] mb-6 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
                Ship code your<br />
                senior team would{" "}
                <span className="text-gradient">approve.</span>
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-lg mb-8 leading-relaxed animate-fade-in-up" style={{ animationDelay: "120ms" }}>
                A panel of specialist AI engineers reviews your repo,{" "}
                <span className="text-[var(--text-primary)]">debates the findings</span>, and a director
                arbitrates — one grounded, prioritized verdict, live in under 45 seconds.
              </p>

              <div className="flex flex-wrap items-center gap-3 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
                <StartCTA />
                <a href="https://github.com/Noel-Teens/DevCouncil" target="_blank" rel="noreferrer" className="btn-ghost text-[15px] px-5 py-3.5">
                  <GitBranch size={17} /> GitHub
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-7 text-[13px] text-[var(--text-muted)] animate-fade-in-up" style={{ animationDelay: "260ms" }}>
                <span className="flex items-center gap-1.5"><Check size={14} style={{ color: "var(--accent)" }} /> GitHub login</span>
                <span className="flex items-center gap-1.5"><Check size={14} style={{ color: "var(--accent)" }} /> Bandit-grounded</span>
                <span className="flex items-center gap-1.5"><Check size={14} style={{ color: "var(--accent)" }} /> Free to run</span>
              </div>
            </div>

            {/* Right — live debate */}
            <div className="animate-fade-in-up lg:pl-4" style={{ animationDelay: "220ms" }}>
              <HeroDebate />
            </div>
          </div>

          {/* Ticker */}
          <div className="z-content relative border-y border-[var(--border)]" style={{ background: "rgba(255,255,255,0.015)" }}>
            <div className="flex items-center">
              <span className="hidden sm:flex items-center gap-2 px-5 py-3 border-r border-[var(--border)] flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-glow" />
                <span className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Scans for</span>
              </span>
              <div className="marquee-mask overflow-hidden flex-1">
                <div className="py-3" style={{ display: "flex", width: "max-content", animation: "marquee 34s linear infinite" }}>
                  {[...MARQUEE, ...MARQUEE].map((m, i) => (
                    <span key={i} className="mono text-[12px] text-[var(--text-muted)]" style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
                      {m}
                      <span style={{ margin: "0 1.6rem", color: "var(--accent)", opacity: 0.4 }}>/</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="z-content max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATS.map((s, i) => (
              <Reveal key={s.k} delay={i * 70}>
                <SpotlightCard className="glass-card p-5 h-full">
                  <s.Icon size={18} className="text-[var(--text-muted)] mb-3" />
                  <div className="display-lg text-[var(--text-primary)] mb-1" style={{ fontSize: "1.9rem" }}>{s.k}</div>
                  <div className="mono text-[11px] text-[var(--text-muted)] uppercase tracking-wider">{s.v}</div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── THE COUNCIL ── */}
        <section className="z-content max-w-7xl mx-auto px-6 py-16">
          <Reveal>
            <div className="flex items-center gap-4 mb-3">
              <span className="eyebrow whitespace-nowrap">The council</span>
              <div className="rule-accent flex-1" />
            </div>
            <h2 className="display-lg text-[var(--text-primary)] mb-10 max-w-2xl">
              Four minds. Separate contexts. <span className="text-[var(--text-muted)]">Real disagreement.</span>
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <CouncilTabs />
          </Reveal>
        </section>

        {/* ── THE OUTPUT (showcase) ── */}
        <section className="z-content max-w-7xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 items-center">
            <Reveal>
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <span className="eyebrow whitespace-nowrap">The output</span>
                  <div className="rule-accent flex-1" />
                </div>
                <h2 className="display-lg text-[var(--text-primary)] mb-4">
                  Not a wall of text.<br />
                  <span className="text-[var(--text-muted)]">A ranked verdict.</span>
                </h2>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed max-w-md mb-6">
                  Every finding carries an exact file and line, a severity you can trust, and a concrete fix.
                  Scanner-grounded issues are marked{" "}
                  <span className="mono text-[12px] px-1.5 py-0.5 rounded" style={{ color: "var(--accent)", background: "var(--accent-quiet)" }}>verified</span>.
                </p>
                <ul className="space-y-2.5 text-[13.5px] text-[var(--text-secondary)]">
                  {["Deduped by root cause", "Conflicts resolved & explained", "Prioritized action plan with effort estimates"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-quiet)" }}>
                        <Check size={11} style={{ color: "var(--accent)" }} />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <SpotlightCard className="glass-card elevate p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border)]">
                  <span className="mono text-[11px] text-[var(--text-muted)] flex items-center gap-1.5"><GitBranch size={13} /> acme/payments-api</span>
                  <span className="mono text-[10px] px-2 py-0.5 rounded" style={{ color: "var(--accent)", background: "var(--accent-quiet)" }}>3 verified</span>
                </div>

                <div className="rounded-xl border border-[var(--border)] p-4 mb-3" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="severity-badge severity-critical">Critical</span>
                    <span className="mono text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded">Hardcoded Secret</span>
                    <span className="mono text-[10px] font-semibold px-2 py-0.5 rounded ml-auto" style={{ color: "#ff6a6a", background: "rgba(255,76,76,0.1)", border: "1px solid rgba(255,76,76,0.28)" }}>VETO</span>
                  </div>
                  <div className="mono text-[11px] text-[var(--text-muted)] mb-2">config/settings.py<span style={{ color: "var(--accent)" }}>:23</span></div>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">Hardcoded AWS secret key (Bandit B105), present in git history — immediately exploitable.</p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                    <AgentBadge agent="security" size={20} radius={6} />
                    <span className="mono text-[11px] text-[var(--text-muted)]">Security</span>
                    <span className="mono px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider ml-1" style={{ color: "var(--accent)", background: "var(--accent-quiet)" }}>VERIFIED</span>
                    <span className="mono text-[10px] text-[var(--text-muted)] ml-auto">98%</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="severity-badge severity-medium">Medium</span>
                    <span className="mono text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded">Architecture</span>
                  </div>
                  <div className="mono text-[11px] text-[var(--text-muted)] mb-2">src/services/users.py<span style={{ color: "var(--accent)" }}>:240</span></div>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">Adopt a modular monolith — extract the shared helper rather than splitting into services.</p>
                </div>
              </SpotlightCard>
            </Reveal>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="z-content max-w-7xl mx-auto px-6 py-16">
          <Reveal>
            <div className="flex items-center gap-4 mb-10">
              <span className="eyebrow whitespace-nowrap">How it works</span>
              <div className="rule-accent flex-1" />
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delay={i * 100}>
                <SpotlightCard className="glass-card p-6 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 flex items-center justify-center rounded-xl border" style={{ color: "var(--accent)", borderColor: "var(--accent-line)", background: "var(--accent-quiet)" }}>
                      <s.Icon size={18} />
                    </span>
                    <span className="mono text-[11px] text-[var(--text-faint)]">{s.step}</span>
                  </div>
                  <h3 className="heading text-[15px] text-[var(--text-primary)] mb-2">{s.title}</h3>
                  <p className="text-[13.5px] text-[var(--text-muted)] leading-relaxed">{s.description}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="z-content max-w-3xl mx-auto px-6 py-16">
          <Reveal>
            <div className="flex items-center gap-4 mb-8">
              <span className="eyebrow whitespace-nowrap flex items-center gap-2"><HelpCircle size={13} /> FAQ</span>
              <div className="rule-accent flex-1" />
            </div>
          </Reveal>
          <Reveal delay={60}>
            <Faq />
          </Reveal>
        </section>

        {/* ── WHY NOT CHATGPT ── */}
        <section className="z-content max-w-5xl mx-auto px-6 py-16 pb-24">
          <Reveal>
            <SpotlightCard className="glass-card overflow-hidden">
              <div className="grid sm:grid-cols-2">
                <div className="p-7 border-b sm:border-b-0 sm:border-r border-[var(--border)]">
                  <div className="eyebrow mb-4">One model, all roles</div>
                  <ul className="space-y-3 text-[13.5px] text-[var(--text-muted)]">
                    {["Can't genuinely disagree with itself", "Invents findings with no source", "Averages every concern into mush"].map((t) => (
                      <li key={t} className="flex gap-2.5"><X size={15} className="text-[var(--text-faint)] mt-0.5 flex-shrink-0" /> {t}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-7 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, var(--accent-quiet), transparent 70%)" }} />
                  <div className="eyebrow mb-4 z-content relative flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                    <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><Check size={11} /></div>
                    DevCouncil
                  </div>
                  <ul className="space-y-3 text-[13.5px] text-[var(--text-secondary)] z-content relative">
                    {["Security can overrule the Architect — live", "Findings grounded in real scanner output", "One arbitrated verdict, every conflict explained"].map((t) => (
                      <li key={t} className="flex gap-2.5"><Check size={15} style={{ color: "var(--accent)" }} className="mt-0.5 flex-shrink-0" /> {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={100}>
            <div className="text-center mt-12">
              <StartCTA label="Review your first repo" />
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="z-content border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              <ArrowUpRight size={14} strokeWidth={2.5} />
            </div>
            <span className="text-sm text-[var(--text-muted)]">DevCouncil — every dev deserves a senior team.</span>
          </div>
          <span className="mono text-[11px] text-[var(--text-faint)]">Groq · Llama 3.3 · FastAPI · Next.js</span>
        </div>
      </footer>
    </div>
  );
}
