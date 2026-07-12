"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const FAQ = [
  {
    q: "How is this different from just asking ChatGPT?",
    a: "One model can't genuinely disagree with itself. DevCouncil runs each specialist in a separate context with its own system prompt, so the Security agent can actually overrule the Architect — live. And every finding is grounded in a real static-analysis scanner, not invented.",
  },
  {
    q: "Is my code stored anywhere?",
    a: "We fetch your repository's files through the GitHub API to analyze them and persist only the resulting report. Your code is never used to train any model.",
  },
  {
    q: "Which languages are supported?",
    a: "The LLM review works on any language. Scanner-grounded 'verified' findings currently cover Python via Bandit; Semgrep for multi-language grounding is on the roadmap.",
  },
  {
    q: "How long does it take, and what does it cost?",
    a: "About 45 seconds end-to-end, for under $0.05 in tokens per full analysis. It's free to run.",
  },
  {
    q: "Do I have to sign in?",
    a: "Signing in with GitHub lets you pick straight from your own repositories. Guest mode works instantly for any public repo URL.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="glass-card overflow-hidden">
      {FAQ.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="accordion-item last:border-0">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="accordion-trigger w-full flex items-center justify-between gap-4 p-5 text-left"
              style={{ color: isOpen ? "var(--text-primary)" : "var(--text-secondary)" }}
            >
              <span className="text-[14px] font-medium">{f.q}</span>
              <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="flex-shrink-0">
                <Plus size={18} style={{ color: isOpen ? "var(--accent)" : "var(--text-muted)" }} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-[13.5px] text-[var(--text-muted)] leading-relaxed max-w-2xl">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
