"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** Thin accent bar at the very top that tracks scroll progress. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 24, mass: 0.3 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[70] origin-left"
      style={{ scaleX, height: 2, background: "var(--grad-accent)", boxShadow: "0 0 12px var(--accent-glow)" }}
      aria-hidden
    />
  );
}
