"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Loader2, Check, ArrowLeft, Quote } from "lucide-react";
import HeroDebate from "../components/HeroDebate";
import OrbField from "../components/OrbField";
import { useAuth } from "../components/AuthProvider";

export default function LoginPage() {
  const { loginAsGuest, loginWithGitHub, isAuthenticated } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  const handleGuestLogin = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      await loginAsGuest();
      router.push("/dashboard");
    } catch {
      setError("Failed to create guest session. Please try again.");
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Brand panel ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 overflow-hidden">
        <OrbField />
        <div className="absolute inset-0 grid-pattern opacity-70" />
        <div className="absolute top-0 right-0 bottom-0 w-px" style={{ background: "linear-gradient(180deg, transparent, var(--border-strong), transparent)" }} />

        <Link href="/" className="z-content flex items-center gap-2.5 w-fit group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mono text-[13px] font-bold transition-transform group-hover:scale-105" style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "0 0 24px -6px var(--accent-glow)" }}>DC</div>
          <span className="font-display font-semibold text-[16px] text-[var(--text-primary)]">DevCouncil<span className="text-[var(--text-muted)] font-normal ml-1">/ AI</span></span>
        </Link>

        <div className="z-content w-full max-w-[520px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <div className="eyebrow mb-4">The council convenes</div>
            <h2 className="display-lg text-[var(--text-primary)] mb-7 leading-[1.06]">
              Your senior engineering team, <span className="text-gradient">on demand.</span>
            </h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}>
            <HeroDebate fill />
          </motion.div>
        </div>

        <div className="z-content flex items-center gap-6 mono text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[var(--accent)]" /> 3 specialists</span>
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[var(--accent)]" /> Bandit-grounded</span>
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[var(--accent)]" /> &lt; 45s</span>
        </div>
      </div>

      {/* ── Auth panel ── */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute inset-0 lg:hidden overflow-hidden"><OrbField /><div className="absolute inset-0 grid-pattern opacity-60" /></div>

        <motion.div
          className="z-content w-full max-w-sm"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/" className="lg:hidden inline-flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-8 transition-colors">
            <ArrowLeft size={15} /> Back
          </Link>
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mono text-sm font-bold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>DC</div>
            <span className="font-display font-semibold text-[16px]">DevCouncil<span className="text-[var(--text-muted)] font-normal ml-1">/ AI</span></span>
          </div>

          <div className="eyebrow mb-2">Get started</div>
          <h1 className="display-lg text-[var(--text-primary)] mb-2" style={{ fontSize: "2.2rem" }}>Sign in</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mb-8 leading-relaxed">
            Connect a repository and convene your council of AI reviewers.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[rgba(255,76,76,0.08)] border border-[rgba(255,76,76,0.25)] text-[13px] text-[#ff8080] animate-fade-in">{error}</div>
          )}

          <motion.button
            onClick={loginWithGitHub}
            id="github-login-button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl text-[14px] font-semibold text-[var(--text-primary)]"
            style={{ background: "linear-gradient(180deg, #1c1f24, #15181d)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-md)" }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
            Continue with GitHub
          </motion.button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="mono text-[10px] text-[var(--text-faint)] uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <motion.button
            onClick={handleGuestLogin}
            disabled={guestLoading}
            id="guest-login-button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="btn-ghost w-full justify-center py-4 text-[14px]"
          >
            {guestLoading ? (<><Loader2 size={16} className="animate-spin" /> Creating session…</>) : (<><User size={16} /> Continue as guest</>)}
          </motion.button>

          <div className="mt-7 grid gap-2.5">
            {["Full GitHub repo access", "Live streaming debate room", "Grounded, prioritized report"].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-[13px] text-[var(--text-muted)]">
                <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-quiet)" }}><Check size={11} style={{ color: "var(--accent)" }} /></span>
                {t}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-[var(--border)] p-4 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
            <Quote size={26} className="absolute right-3 top-3 text-[var(--text-faint)] opacity-30" />
            <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed italic relative z-10">
              &ldquo;Four AI reviewers just argued about my codebase — and they were all right about different things.&rdquo;
            </p>
            <div className="mono text-[10px] text-[var(--text-muted)] mt-2.5 uppercase tracking-wider">— first user, demo analysis</div>
          </div>

          <p className="mono text-[11px] text-[var(--text-faint)] mt-6">Guest sessions last 24 hours · No credit card.</p>
        </motion.div>
      </div>
    </div>
  );
}
