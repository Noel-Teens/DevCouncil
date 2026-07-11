"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

const DEMOS = [
  {
    scenario: "disagreement",
    label: "The Disagreement",
    hint: "Architect vs. Security — watch them argue microservices, then reach consensus",
    icon: "⚔️",
  },
  {
    scenario: "hardcoded_secret",
    label: "The Hardcoded Secret",
    hint: "Bandit-grounded CRITICAL with Security veto power",
    icon: "🔑",
  },
];

export default function DemoButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDemo = async (scenario: string) => {
    setLoading(scenario);
    setError(null);
    try {
      const res = await api.createDemoAnalysis(scenario);
      router.push(`/analyze/${res.analysis_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the demo.");
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
      <p className="text-xs text-[var(--text-muted)] mb-3">
        No repo handy? Watch a live demo — no signup, runs instantly:
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {DEMOS.map((d) => (
          <button
            key={d.scenario}
            onClick={() => runDemo(d.scenario)}
            disabled={loading !== null}
            title={d.hint}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-base">{d.icon}</span>
            <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
              {loading === d.scenario ? "Starting…" : d.label}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-3">{error}</p>
      )}
    </div>
  );
}
