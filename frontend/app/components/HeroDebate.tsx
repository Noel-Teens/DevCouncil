"use client";

import { useEffect, useRef, useState } from "react";
import { AgentBadge } from "../lib/agents";

type Line = {
  key: string;
  agent: string;
  name: string;
  color: string;
  badge: string;
  badgeClass: string;
  text: React.ReactNode;
  conf?: number;
};

const CODE = (s: string) => (
  <code
    key={s}
    className="mono"
    style={{
      fontSize: "11px",
      background: "rgba(255,255,255,0.07)",
      padding: "0 5px",
      borderRadius: "4px",
      color: "#c6f24e",
    }}
  >
    {s}
  </code>
);

const SCRIPT: Line[] = [
  {
    key: "ar1",
    agent: "architect",
    name: "Architect",
    color: "#5eb1ef",
    badge: "finding",
    badgeClass: "turn-new_finding",
    text: <>Split <b>UserService</b> into two microservices — clear domain seam at users.py:234.</>,
    conf: 78,
  },
  {
    key: "se1",
    agent: "security",
    name: "Security",
    color: "#ff6b6b",
    badge: "challenge",
    badgeClass: "turn-challenge",
    text: (
      <>Challenges {CODE("architect_1")} — inter-service JWT adds 4 attack vectors at &lt;1k users.</>
    ),
    conf: 91,
  },
  {
    key: "ar2",
    agent: "architect",
    name: "Architect",
    color: "#5eb1ef",
    badge: "concede",
    badgeClass: "turn-concede",
    text: <>Concedes {CODE("security_1")} — valid at this scale. Withdrawing microservices.</>,
    conf: 84,
  },
  {
    key: "cd1",
    agent: "consensus_director",
    name: "Consensus",
    color: "#c6f24e",
    badge: "verdict",
    badgeClass: "turn-agree",
    text: <><b>Modular monolith adopted.</b> Security overrides on attack-surface grounds.</>,
  },
];

export default function HeroDebate({ fill = false }: { fill?: boolean }) {
  const [count, setCount] = useState(fill ? SCRIPT.length : 0);
  const [typing, setTyping] = useState(!fill);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (fill) return; // static, fully-populated (used on brand panels)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCount(SCRIPT.length);
      setTyping(false);
      return;
    }
    let alive = true;

    const run = () => {
      setCount(0);
      setTyping(true);
      const seq: Array<() => void> = [];
      for (let i = 0; i < SCRIPT.length; i++) {
        seq.push(() => setTyping(true));
        seq.push(() => {
          setCount(i + 1);
          setTyping(i + 1 < SCRIPT.length);
        });
      }
      // schedule: typing 700ms, reveal, hold 1500ms → next
      let t = 400;
      seq.forEach((fn, i) => {
        const delay = i % 2 === 0 ? 0 : 700; // typing shows, then reveal after 700
        t += delay;
        const timer = setTimeout(() => alive && fn(), t);
        timers.current.push(timer);
        if (i % 2 === 1) t += 1500; // hold after reveal
      });
      // loop
      const loop = setTimeout(() => alive && run(), t + 2600);
      timers.current.push(loop);
    };
    run();

    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [fill]);

  const nextSpeaker = SCRIPT[count];

  return (
    <div className="glass-card elevate overflow-hidden" style={{ width: "100%" }}>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff5c5c] opacity-60 animate-ring" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff5c5c]" />
          </span>
          <span className="mono text-[11px] tracking-widest text-[var(--text-secondary)] uppercase">
            Live · Discussion Room
          </span>
        </div>
        <span className="mono text-[10px] text-[var(--text-muted)]">round 2</span>
      </div>

      {/* messages */}
      <div className="p-3.5 space-y-2.5" style={{ minHeight: 292 }}>
        {SCRIPT.slice(0, count).map((l) => (
          <div key={l.key} className="flex gap-2.5 animate-slide-in-right">
            <AgentBadge agent={l.agent} size={30} radius={8} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold" style={{ color: l.color }}>{l.name}</span>
                <span className={`turn-badge ${l.badgeClass}`}>{l.badge}</span>
                {l.conf != null && (
                  <span className="mono text-[10px] text-[var(--text-muted)]">{l.conf}%</span>
                )}
              </div>
              <div
                className="text-[13px] leading-relaxed text-[var(--text-secondary)] rounded-lg px-3 py-2 border"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)", borderLeft: `2px solid ${l.color}66` }}
              >
                {l.text}
              </div>
            </div>
          </div>
        ))}

        {/* typing indicator */}
        {typing && nextSpeaker && (
          <div className="flex gap-2.5 items-center animate-fade-in">
            <AgentBadge agent={nextSpeaker.agent} size={30} radius={8} />
            <div className="flex items-end gap-1 h-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block w-1 rounded-full"
                  style={{
                    height: 6 + i * 3,
                    background: nextSpeaker.color,
                    opacity: 0.7,
                    animation: `pulse-dot 0.9s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* footer verdict */}
      <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
        <span className="mono text-[10px] text-[var(--text-muted)]">consensus_director.py</span>
        <span
          className="mono text-[10px] font-semibold px-2 py-0.5 rounded"
          style={{
            color: count >= SCRIPT.length ? "var(--accent)" : "var(--text-faint)",
            background: count >= SCRIPT.length ? "var(--accent-quiet)" : "transparent",
            transition: "all 0.4s ease",
          }}
        >
          {count >= SCRIPT.length ? "✓ verdict reached" : "deliberating…"}
        </span>
      </div>
    </div>
  );
}
