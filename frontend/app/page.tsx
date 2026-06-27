import RepoInput from "./components/RepoInput";

const FEATURES = [
  {
    icon: "🏗️",
    title: "Architect Agent",
    description: "Identifies coupling, scalability issues, and architectural anti-patterns",
    color: "#6366f1",
  },
  {
    icon: "🛡️",
    title: "Security Agent",
    description: "Scans for OWASP Top 10 vulnerabilities with veto power on critical findings",
    color: "#ef4444",
  },
  {
    icon: "🔍",
    title: "Code Reviewer",
    description: "Finds code smells, error handling gaps, and performance anti-patterns",
    color: "#06b6d4",
  },
  {
    icon: "⚖️",
    title: "Consensus Director",
    description: "Resolves agent conflicts and produces a unified, prioritized action plan",
    color: "#f59e0b",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Paste Your Repo URL",
    description: "Drop in any public GitHub repository URL.",
  },
  {
    step: "02",
    title: "Watch the Debate",
    description: "3 specialist agents analyze in parallel, then challenge each other live.",
  },
  {
    step: "03",
    title: "Get Your Report",
    description: "Unified consensus report with prioritized fixes and conflict explanations.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: "var(--gradient-primary)" }}
            >
              DC
            </div>
            <span className="font-bold text-[var(--text-primary)] text-lg tracking-tight">
              DevCouncil
              <span className="text-[var(--accent)] ml-1">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 hero-bg grid-pattern">
        <section className="relative pt-40 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-xs font-medium text-[var(--accent)]">
                Multi-Agent Code Analysis
              </span>
            </div>

            {/* Heading */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6 animate-fade-in-up"
              style={{ animationDelay: "100ms" }}
            >
              <span className="text-[var(--text-primary)]">Your code, reviewed by a </span>
              <span
                className="animate-gradient bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899, #6366f1)",
                  backgroundSize: "300% 300%",
                }}
              >
                panel of AI experts
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
              style={{ animationDelay: "200ms" }}
            >
              Specialized AI agents analyze your GitHub repo in parallel — architecture,
              security, and code quality. They debate, disagree, and produce a consensus
              report in under 45 seconds.
            </p>

            {/* Input */}
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: "300ms" }}
            >
              <RepoInput />
            </div>

            {/* Social proof */}
            <div
              className="flex items-center justify-center gap-6 mt-8 text-sm text-[var(--text-muted)] animate-fade-in-up"
              style={{ animationDelay: "400ms" }}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> Free to use
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> Under $0.05 per analysis
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> No signup required
              </span>
            </div>
          </div>
        </section>

        {/* Agent Cards */}
        <section className="relative px-6 pb-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-10">
              Your Virtual Engineering Team
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((feature, idx) => (
                <div
                  key={feature.title}
                  className="glass-card p-5 text-center animate-fade-in-up"
                  style={{ animationDelay: `${idx * 100 + 500}ms` }}
                >
                  <div
                    className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-2xl mb-4"
                    style={{
                      background: `${feature.color}15`,
                      boxShadow: `0 0 20px ${feature.color}10`,
                    }}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="relative px-6 pb-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-10">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((step, idx) => (
                <div
                  key={step.step}
                  className="relative animate-fade-in-up"
                  style={{ animationDelay: `${idx * 150 + 800}ms` }}
                >
                  {/* Connector line */}
                  {idx < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-40px)] h-px bg-gradient-to-r from-[var(--accent)]/30 to-transparent" />
                  )}
                  <div className="text-center">
                    <div
                      className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-xl font-bold mb-4"
                      style={{
                        background: "var(--gradient-primary)",
                        boxShadow: "0 0 30px var(--accent-glow)",
                      }}
                    >
                      {step.step}
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>© 2026 DevCouncil AI — Multi-Agent Code Review Platform</span>
          <span>Powered by Groq + Llama 3.3</span>
        </div>
      </footer>
    </div>
  );
}
