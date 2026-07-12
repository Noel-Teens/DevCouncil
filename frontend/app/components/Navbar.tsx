"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

interface NavbarProps {
  /** Optional breadcrumb text shown after the logo */
  breadcrumb?: string;
  /** Optional right-side content (e.g., status badges) */
  rightContent?: React.ReactNode;
}

export default function Navbar({ breadcrumb, rightContent }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300"
      style={{
        background: scrolled ? "rgba(7, 8, 9, 0.85)" : "rgba(7, 8, 9, 0.4)",
        borderColor: scrolled ? "var(--border)" : "transparent",
        backdropFilter: "blur(14px) saturate(1.4)",
        WebkitBackdropFilter: "blur(14px) saturate(1.4)",
        boxShadow: scrolled ? "0 8px 30px -20px rgba(0,0,0,0.9)" : "none",
      }}
    >
      <div className={`max-w-7xl mx-auto px-6 flex items-center justify-between transition-all duration-300 ${scrolled ? "h-13" : "h-16"}`} style={{ height: scrolled ? 52 : 64 }}>
        {/* Left — Logo + Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center mono text-[12px] font-bold transition-transform group-hover:scale-105"
              style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "0 0 20px -6px var(--accent-glow)" }}
            >
              DC
            </div>
            <span className="font-display font-semibold text-[var(--text-primary)] text-[15px] tracking-tight">
              DevCouncil
              <span className="text-[var(--text-muted)] ml-1 font-normal">/ AI</span>
            </span>
          </Link>

          {breadcrumb && (
            <>
              <span className="text-[var(--text-muted)] text-xs">/</span>
              <span className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[200px]">
                {breadcrumb}
              </span>
            </>
          )}
        </div>

        {/* Right — Nav links + auth + custom content */}
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard"
            className={`text-sm transition-colors ${
              isActive("/dashboard")
                ? "text-[var(--accent)] font-medium"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Dashboard
          </Link>

          {/* Auth section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-muted)] bg-[var(--surface)] px-2.5 py-1 rounded-full border border-[var(--border)]">
                {user?.username === "guest" ? "👤 Guest" : `@${user?.username}`}
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              Sign In
            </Link>
          )}

          {rightContent}
        </div>
      </div>
    </nav>
  );
}
