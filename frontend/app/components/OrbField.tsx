"use client";

import { motion } from "framer-motion";

const ORBS = [
  { color: "rgba(198,242,78,0.16)", size: 460, x: "4%", y: "6%", dur: 19 },
  { color: "rgba(88,230,184,0.13)", size: 380, x: "58%", y: "4%", dur: 24 },
  { color: "rgba(94,177,239,0.10)", size: 320, x: "34%", y: "54%", dur: 28 },
  { color: "rgba(198,242,78,0.08)", size: 260, x: "70%", y: "60%", dur: 22 },
];

/** Slow drifting colored glows — fills empty panel space with gentle motion. */
export default function OrbField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: o.x,
            top: o.y,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle, ${o.color}, transparent 66%)`,
            filter: "blur(44px)",
          }}
          animate={{ x: [0, 34, -22, 0], y: [0, -28, 22, 0], scale: [1, 1.12, 0.94, 1] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
