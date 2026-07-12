"use client";

import { useEffect, useRef } from "react";

/** A soft accent glow that follows the pointer across the whole page. */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return; // skip on touch
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const apply = () => {
      raf = 0;
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor-glow" aria-hidden />;
}
