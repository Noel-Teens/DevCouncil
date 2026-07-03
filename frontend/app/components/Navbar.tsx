"use client";

import Link from "next/link";
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

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left — Logo + Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "var(--gradient-primary)" }}
            >
              DC
            </div>
            <span className="font-bold text-[var(--text-primary)] text-lg tracking-tight">
              DevCouncil
              <span className="text-[var(--accent)] ml-1">AI</span>
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
